import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';

import { errorHandler } from '@shared/middleware/error-handler';
import { initializeDatabase, AppDataSource } from '@shared/infrastructure/database/typeorm.config';
import { createContractReviewerMiddleware } from '@shared/middleware/contract-reviewer.middleware';
import { createUserRoutes } from '@presentation/routes/user.routes';
import { createColaboratorRoutes } from '@presentation/routes/colaborators.routes';
import { createContractRoutes } from '@presentation/routes/contract.routes';
import { createDocumentTypeRoutes } from '@presentation/routes/document-type.routes';
import { createDocumentSubtypeRoutes } from '@presentation/routes/document-subtype.routes';
import { createDocumentRoutes } from '@presentation/routes/document.routes';
import { createDocumentHistoryRoutes } from '@presentation/routes/document-history.routes';
import { createPermissionRoutes } from '@presentation/routes/permission.routes';
import { createRoleRoutes } from '@presentation/routes/role.routes';
import { createColaboratorGroupRoutes } from '@presentation/routes/colaborator-group.routes';
import { createFamilyRoutes } from '@presentation/routes/family.routes';
import { createDocumentModelRoutes } from '@presentation/routes/document-model.routes';
import { createGroupRoutes } from '@presentation/routes/group.routes';
import { createAuthRoutes } from '@presentation/routes/auth.routes';
import { createFileRoutes } from '@presentation/routes/file.routes';
import { createFileShareAuthRoutes, createSharedFileRoutes } from '@presentation/routes/file-share.routes';
import { createCompanyRoutes } from '@presentation/routes/company.routes';
import { createAreaRoutes } from '@presentation/routes/area.routes';
import { createDivisionRoutes } from '@presentation/routes/division.routes';
import { createDocumentTemplateRoutes } from '@presentation/routes/document-template.routes';
import { createSignatureRoutes } from '@presentation/routes/signature.routes';
import { createSignatureFlowRoutes } from '@presentation/routes/signature-flow.routes';
import { createExternalParticipantRoutes } from '@presentation/routes/external-participant.routes';
import { createEmailQueueRoutes } from '@presentation/routes/email-queue.routes';
import { createLandingSettingsRoutes } from '@presentation/routes/landing-settings.routes';
import { DependencyContainer } from './dependency-container';
import { runInitialSeedsIfEmpty } from '@shared/infrastructure/database/seeds/initial-seeds';
import { RouteError } from '@shared/domain/errors';
import { authInit } from '@shared/utils/requests';

export class App {
  private app: Application;
  private dependencyContainer: DependencyContainer;

  constructor() {
    this.app = express();
    this.dependencyContainer = new DependencyContainer();
  }

  public async initialize(): Promise<void> {
    // Initialize database
    await initializeDatabase();

    // Initialize dependencies
    await this.dependencyContainer.initialize();

    // Run initial seeds only if not in production
    if (process.env.NODE_ENV !== 'production') {
      await runInitialSeedsIfEmpty();
    }

    // Start email queue background processor
    if (process.env.NODE_ENV !== 'test') {
      this.dependencyContainer.getEmailQueueProcessor().start();
      this.dependencyContainer.getSignatureFlowAutoCloseProcessor().start();
    }

    // Setup middleware
    this.setupMiddleware();

    // Setup routes
    this.setupRoutes();

    // Setup error handling
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    }));

    // Initial auth middleware (auth object in the request with things like clean cookies)
    this.app.use(authInit);

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '300000'), // 1 minute
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // limit each IP to 100 requests per windowMs
      message: {
        error: {
          message: 'Too many requests from this IP, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }

    // Health check middleware
    this.app.use('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      });
    });
  }

  private setupRoutes(): void {
    // API info endpoint
    this.app.get('/api', (req: Request, res: Response) => {
      res.status(200).json({
        message: 'Gestion Documental API',
        version: '1.0.0',
        endpoints: {
          users: '/api/users',
          contracts: '/api/contracts',
          colaborators: '/api/colaborators',
          documents: '/api/documents',
          documentHistory: '/api/document-history',
          documentSubtypes: '/api/documents/subtypes',
          documentTypes: '/api/documents/types',
          health: '/health',
          permissions: '/api/permissions',
          roles: '/api/roles',
          colaboratorGroups: '/api/colaborator-groups',
          families: '/api/families',
          documentModels: '/api/document-models',
          groups: '/api/groups',
          companies: '/api/companies',
          areas: '/api/areas',
          divisions: '/api/divisions',
          landingSettings: '/api/landing-settings',
          files: '/api/files',
          auth: {
            login: '/api/auth/login',
            logout: '/api/auth/logout',
            permissions: '/api/auth/permissions',
          },
        },
      });
    });

    // Get controllers from dependency container
    const userController = this.dependencyContainer.getUserController();
    const contractController = this.dependencyContainer.getContractController();
    const colaboratorController = this.dependencyContainer.getColaboratorController();
    const documentTypeController = this.dependencyContainer.getDocumentTypeController();
    const documentSubtypeController = this.dependencyContainer.getDocumentSubtypeController();
    const documentController = this.dependencyContainer.getDocumentController();
    const documentHistoryController = this.dependencyContainer.getDocumentHistoryController();
    const permissionController = this.dependencyContainer.getPermissionController();
    const familyController = this.dependencyContainer.getFamilyController();
    const documentModelController = this.dependencyContainer.getDocumentModelController();
    const groupController = this.dependencyContainer.getGroupController();
    const roleController = this.dependencyContainer.getRoleController();
    const colaboratorGroupController = this.dependencyContainer.getColaboratorGroupController();
    const areaController = this.dependencyContainer.getAreaController();
    const divisionController = this.dependencyContainer.getDivisionController();
    const authController = this.dependencyContainer.getAuthController();
    const fileController = this.dependencyContainer.getFileController();
    const companyController = this.dependencyContainer.getCompanyController();
    const bulkTemplateController = this.dependencyContainer.getBulkTemplateController();
    const fileShareController = this.dependencyContainer.getFileShareController();
    const documentTemplateController = this.dependencyContainer.getDocumentTemplateController();
    const signatureController = this.dependencyContainer.getSignatureController();
    const signatureFlowController = this.dependencyContainer.getSignatureFlowController();
    const emailQueueController = this.dependencyContainer.getEmailQueueController();
    const landingSettingsController = this.dependencyContainer.getLandingSettingsController();

    // Get use cases and repositories needed for middleware
    const checkUserCanReviewContractUseCase = this.dependencyContainer.getCheckUserCanReviewContractUseCase();
    const documentRepository = this.dependencyContainer.getDocumentRepository();

    // Create middleware instances
    const contractReviewerMiddleware = createContractReviewerMiddleware(
      checkUserCanReviewContractUseCase,
      documentRepository,
    );

    // API routes
    this.app.use('/api/users', createUserRoutes(userController));
    this.app.use('/api/contracts', createContractRoutes(contractController));
    this.app.use('/api/colaborators', createColaboratorRoutes(colaboratorController, bulkTemplateController));
    this.app.use('/api/documents/types', createDocumentTypeRoutes(documentTypeController));
    this.app.use('/api/documents/subtypes', createDocumentSubtypeRoutes(documentSubtypeController));

    this.app.use('/api/document-history', createDocumentHistoryRoutes(documentHistoryController));
    this.app.use('/api/documents', createDocumentRoutes(documentController, contractReviewerMiddleware));
    this.app.use('/api/permissions', createPermissionRoutes(permissionController));
    this.app.use('/api/roles', createRoleRoutes(roleController));
    this.app.use('/api/families', createFamilyRoutes(familyController));
    this.app.use('/api/document-models', createDocumentModelRoutes(documentModelController));
    this.app.use('/api/groups', createGroupRoutes(groupController));
    this.app.use('/api/colaborator-groups', createColaboratorGroupRoutes(colaboratorGroupController));
    this.app.use('/api/companies', createCompanyRoutes(companyController));
    this.app.use('/api/areas', createAreaRoutes(areaController));
    this.app.use('/api/divisions', createDivisionRoutes(divisionController));
    this.app.use('/api/files', createFileRoutes(fileController));
    this.app.use('/api/files', createFileShareAuthRoutes(fileShareController));
    this.app.use('/api/shared/files', createSharedFileRoutes(fileShareController));
    this.app.use('/api/document-templates', createDocumentTemplateRoutes(documentTemplateController));
    this.app.use('/api/signatures', createSignatureRoutes(signatureController));
    this.app.use('/api/signature-flows', createSignatureFlowRoutes(signatureFlowController));

    const externalParticipantController = this.dependencyContainer.getExternalParticipantController();
    this.app.use('/api/external-access', createExternalParticipantRoutes(externalParticipantController));

    this.app.use('/api/admin/email-queue', createEmailQueueRoutes(emailQueueController));
    this.app.use('/api/landing-settings', createLandingSettingsRoutes(landingSettingsController));

    // Auth routes
    this.app.use('/api/auth', createAuthRoutes(authController));

    // 404 handler for undefined routes
    this.app.use('*', (req: Request, _res: Response) => {
      throw new RouteError(req.originalUrl);
    });
  }

  private setupErrorHandling(): void {
    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  public getApp(): Application {
    return this.app;
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📚 API documentation available at http://localhost:${port}/api`);
      console.log(`❤️  Health check available at http://localhost:${port}/health`);
    });
  }

  public async close(): Promise<void> {
    this.dependencyContainer.getEmailQueueProcessor().stop();
    this.dependencyContainer.getSignatureFlowAutoCloseProcessor().stop();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}
