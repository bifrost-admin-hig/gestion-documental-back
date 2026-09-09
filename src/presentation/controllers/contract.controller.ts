import { Request, Response } from 'express';
import { Contract } from '@domains/contract/entities/contract.entity';
import { CreateContractUseCase } from '@domains/contract/use-cases/create-contract.use-case';
import {
  GetContractByIdUseCase,
  GetAllContractsUseCase,
  GetContractsByRutSociedadUseCase,
  GetContractsByNombreColaboradorUseCase,
  GetContractsByMandanteUseCase,
  GetContractsByDivisionUseCase,
  GetContractsByAreaUseCase,
  GetContractByNumberUseCase,
  GetActiveContractsUseCase,
  GetExpiredContractsUseCase,
  GetContractsEndingBeforeUseCase,
} from '@domains/contract/use-cases/get-contract.use-case';
import {
  UpdateContractUseCase,
  ActivateContractUseCase,
  SuspendContractUseCase,
  TerminateContractUseCase,
  DeleteContractUseCase,
} from '@domains/contract/use-cases/update-contract.use-case';
import { CreateContractDto } from '@presentation/dto/contract/create-contract.dto';
import { UpdateContractDto } from '@presentation/dto/contract/update-contract.dto';
import { ContractResponseDto } from '@presentation/dto/contract/contract-response.dto';
import { asyncHandler } from '@shared/middleware/validation';
import { DateTimeUtils, DateUtils } from '@shared/utils/date';
import { ContractStatus, ContractType, JornadaTrabajo } from '@domains/contract/value-objects/contract-enums';
import { AddSubcontractUseCase } from '@domains/contract/use-cases/add-subcontract.use-case';
import { RemoveSubcontractUseCase } from '@domains/contract/use-cases/remove-subcontract.use-case';
import { GetSubcontractsUseCase } from '@domains/contract/use-cases/get-subcontracts.use-case';
import { GetParentContractsUseCase } from '@domains/contract/use-cases/get-parent-contracts.use-case';
import { AssignReviewerToContractUseCase } from '@domains/contract/use-cases/assign-reviewer-to-contract.use-case';
import { RemoveReviewerFromContractUseCase } from '@domains/contract/use-cases/remove-reviewer-from-contract.use-case';
import { GetContractReviewersUseCase } from '@domains/contract/use-cases/get-contract-reviewers.use-case';
import { UpdateReviewerUseCase } from '@domains/contract/use-cases/update-reviewer.use-case';
import { AssignReviewerDto } from '@presentation/dto/contract/assign-reviewer.dto';
import { UpdateReviewerDto } from '@presentation/dto/contract/update-reviewer.dto';
import { ReviewerResponseDto } from '@presentation/dto/contract/reviewer-response.dto';
import { ContractReviewer } from '@domains/contract/entities/contract-reviewer.entity';
import { GetUserByIdUseCase } from '@domains/user/use-cases/get-user.use-case';
import { AddColaboratorToContractUseCase } from '@domains/contract/use-cases/add-colaborator-to-contract.use-case';
import { RemoveColaboratorFromContractUseCase } from '@domains/contract/use-cases/remove-colaborator-from-contract.use-case';
import { GetContractColaboratorsUseCase } from '@domains/contract/use-cases/get-contract-colaborators.use-case';
import { GetContractDocumentStructureUseCase } from '@domains/contract/use-cases/get-contract-document-structure.use-case';
import { Colaborator } from '@domains/colaborators/entities/colaborator.entity';
import { ValidationError } from '@shared/domain/errors';


export class ContractController {
  constructor(
    private readonly createContractUseCase: CreateContractUseCase,
    private readonly getContractByIdUseCase: GetContractByIdUseCase,
    private readonly getAllContractsUseCase: GetAllContractsUseCase,
    private readonly getContractsByRutSociedadUseCase: GetContractsByRutSociedadUseCase,
    private readonly getContractsByNombreColaboradorUseCase: GetContractsByNombreColaboradorUseCase,
    private readonly getContractsByMandanteUseCase: GetContractsByMandanteUseCase,
    private readonly getContractsByDivisionUseCase: GetContractsByDivisionUseCase,
    private readonly getContractsByAreaUseCase: GetContractsByAreaUseCase,
    private readonly getContractByNumberUseCase: GetContractByNumberUseCase,
    private readonly getActiveContractsUseCase: GetActiveContractsUseCase,
    private readonly getExpiredContractsUseCase: GetExpiredContractsUseCase,
    private readonly getContractsEndingBeforeUseCase: GetContractsEndingBeforeUseCase,
    private readonly updateContractUseCase: UpdateContractUseCase,
    private readonly activateContractUseCase: ActivateContractUseCase,
    private readonly suspendContractUseCase: SuspendContractUseCase,
    private readonly terminateContractUseCase: TerminateContractUseCase,
    private readonly deleteContractUseCase: DeleteContractUseCase,
    private readonly addSubcontractUseCase: AddSubcontractUseCase,
    private readonly removeSubcontractUseCase: RemoveSubcontractUseCase,
    private readonly getSubcontractsUseCase: GetSubcontractsUseCase,
    private readonly assignReviewerToContractUseCase: AssignReviewerToContractUseCase,
    private readonly removeReviewerFromContractUseCase: RemoveReviewerFromContractUseCase,
    private readonly getContractReviewersUseCase: GetContractReviewersUseCase,
    private readonly updateReviewerUseCase: UpdateReviewerUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly addColaboratorToContractUseCase: AddColaboratorToContractUseCase,
    private readonly removeColaboratorFromContractUseCase: RemoveColaboratorFromContractUseCase,
    private readonly getContractColaboratorsUseCase: GetContractColaboratorsUseCase,
    private readonly getParentContractsUseCase: GetParentContractsUseCase,
    private readonly getContractDocumentStructureUseCase: GetContractDocumentStructureUseCase,
  ) { }


  private toResponseDto(contract: Contract): ContractResponseDto {
    const json = contract.toJSON();
    return {
      id: json.id,
      rutSociedad: json.rutSociedad,
      nombreColaborador: json.nombreColaborador,
      startDate: DateUtils.toString(json.startDate),
      endDate: DateUtils.toString(json.endDate),
      contractType: json.contractType as ContractType,
      administradorContratoMandante: json.administradorContratoMandante,
      administradorContratoEmpresa: json.administradorContratoEmpresa,
      rutAdministradorContrato: json.rutAdministradorContrato,
      contractNumber: json.contractNumber,
      nombreMandante: json.nombreMandante,
      division: json.division,
      area: json.area,
      dotacionPersonal: json.dotacionPersonal ?? 0,
      dotacionVehiculos: json.dotacionVehiculos ?? 0,
      descripcionServicio: json.descripcionServicio,
      nombreProyecto: json.nombreProyecto,
      jornadaTrabajo: json.jornadaTrabajo as JornadaTrabajo,
      status: json.status as ContractStatus,
      groupId: json.groupId,
      duration: json.duration,
      isActive: json.isActive,
      isExpired: json.isExpired,
      createdAt: DateTimeUtils.toString(json.createdAt),
      updatedAt: DateTimeUtils.toString(json.updatedAt),
      deletedAt: DateTimeUtils.toString(json.deletedAt, true),
    };
  }

  public createContract = asyncHandler(async (req: Request, res: Response) => {
    const dto: CreateContractDto = req.body;
    const contract = await this.createContractUseCase.execute({
      ...dto,
      groupId: dto.groupId,
    });
    res.status(201).json({
      success: true,
      data: this.toResponseDto(contract),
      message: 'Contract created successfully',
    });
  });

  public getContractById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const contract = await this.getContractByIdUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: this.toResponseDto(contract),
    });
  });

  public getAllContracts = asyncHandler(async (req: Request, res: Response) => {
    const contracts = await this.getAllContractsUseCase.execute(req.auth.groupId);
    res.status(200).json({
      success: true,
      data: contracts.map((contract: Contract) => this.toResponseDto(contract)),
      count: contracts.length,
    });
  });

  public getContractsByRutSociedad = asyncHandler(async (req: Request, res: Response) => {
    const { rutSociedad } = req.params;
    const contracts = await this.getContractsByRutSociedadUseCase.execute(rutSociedad);
    res.status(200).json({
      success: true,
      data: contracts.map((contract: Contract) => this.toResponseDto(contract)),
      count: contracts.length,
    });
  });

  public getContractsByNombreColaborador = asyncHandler(async (req: Request, res: Response) => {
    const { nombre } = req.params;
    const contracts = await this.getContractsByNombreColaboradorUseCase.execute(nombre);
    res.status(200).json({
      success: true,
      data: contracts.map((contract: Contract) => this.toResponseDto(contract)),
      count: contracts.length,
    });
  });

  public getContractsByMandante = asyncHandler(async (req: Request, res: Response) => {
    const { mandante } = req.params;
    const contracts = await this.getContractsByMandanteUseCase.execute(mandante);
    res.status(200).json({
      success: true,
      data: contracts.map((contract: Contract) => this.toResponseDto(contract)),
      count: contracts.length,
    });
  });

  public getContractsByDivision = asyncHandler(async (req: Request, res: Response) => {
    const { division } = req.params;
    const contracts = await this.getContractsByDivisionUseCase.execute(division);
    res.status(200).json({
      success: true,
      data: contracts.map((contract: Contract) => this.toResponseDto(contract)),
      count: contracts.length,
    });
  });

  public getContractsByArea = asyncHandler(async (req: Request, res: Response) => {
    const { area } = req.params;
    const contracts = await this.getContractsByAreaUseCase.execute(area);
    res.status(200).json({
      success: true,
      data: contracts.map((contract: Contract) => this.toResponseDto(contract)),
      count: contracts.length,
    });
  });

  public getContractByNumber = asyncHandler(async (req: Request, res: Response) => {
    const { contractNumber } = req.params;
    const contract = await this.getContractByNumberUseCase.execute(contractNumber);
    res.status(200).json({
      success: true,
      data: this.toResponseDto(contract),
    });
  });

  public getActiveContracts = asyncHandler(async (req: Request, res: Response) => {
    const contracts = await this.getActiveContractsUseCase.execute();
    res.status(200).json({
      success: true,
      data: contracts.map((contract: Contract) => this.toResponseDto(contract)),
      count: contracts.length,
    });
  });

  public getExpiredContracts = asyncHandler(async (req: Request, res: Response) => {
    const contracts = await this.getExpiredContractsUseCase.execute();
    res.status(200).json({
      success: true,
      data: contracts.map((contract: Contract) => this.toResponseDto(contract)),
      count: contracts.length,
    });
  });

  public getContractsEndingBefore = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      throw new ValidationError('Date parameter is required', 'date');
    }

    const contracts = await this.getContractsEndingBeforeUseCase.execute(new Date(date));
    res.status(200).json({
      success: true,
      data: contracts.map((contract: Contract) => this.toResponseDto(contract)),
      count: contracts.length,
    });
  });

  public updateContract = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const dto: UpdateContractDto = req.body;
    const user = req.auth.user;

    const updateRequest = {
      ...dto,
      id,
      endDate: DateUtils.parse(dto.endDate, true) ?? undefined,
      userId: user?.id,
      userRoles: user?.roles,
    };

    const contract = await this.updateContractUseCase.execute(updateRequest);
    res.status(200).json({
      success: true,
      data: this.toResponseDto(contract),
      message: 'Contract updated successfully',
    });
  });

  public activateContract = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const contract = await this.activateContractUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: this.toResponseDto(contract),
      message: 'Contract activated successfully',
    });
  });

  public suspendContract = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const contract = await this.suspendContractUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: this.toResponseDto(contract),
      message: 'Contract suspended successfully',
    });
  });

  public terminateContract = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const contract = await this.terminateContractUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: this.toResponseDto(contract),
      message: 'Contract terminated successfully',
    });
  });

  public deleteContract = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteContractUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'Contract deleted successfully',
    });
  });

  // Subcontract management methods
  public addSubcontract = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { subcontractId } = req.body;

    if (!subcontractId) {
      throw new ValidationError('Subcontract ID is required', 'subcontractId');
    }

    await this.addSubcontractUseCase.execute(id, subcontractId);
    res.status(200).json({
      success: true,
      message: 'Subcontract added successfully',
    });
  });

  public removeSubcontract = asyncHandler(async (req: Request, res: Response) => {
    const { id, subcontractId } = req.params;

    await this.removeSubcontractUseCase.execute(id, subcontractId);
    res.status(200).json({
      success: true,
      message: 'Subcontract removed successfully',
    });
  });

  public getSubcontracts = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const subcontracts = await this.getSubcontractsUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: subcontracts.map((contract: Contract) => this.toResponseDto(contract)),
      count: subcontracts.length,
    });
  });

  public getParentContracts = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const parents = await this.getParentContractsUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: parents.map((contract: Contract) => this.toResponseDto(contract)),
      count: parents.length,
    });
  });

  // Reviewer management methods
  private async toReviewerResponseDto(reviewer: ContractReviewer): Promise<ReviewerResponseDto> {
    const json = reviewer.toJSON();

    // Buscar información del usuario
    let userName: string | undefined;
    let userEmail: string | undefined;

    try {
      const user = await this.getUserByIdUseCase.execute(json.userId);
      if (user) {
        userName = `${user.firstName} ${user.lastName}`;
        userEmail = user.email.toString();
      }
    } catch {
      // Si no se encuentra el usuario, continuar sin sus datos
      console.warn(`User ${json.userId} not found for reviewer ${json.id}`);
    }

    return {
      id: json.id,
      userId: json.userId,
      userName,
      userEmail,
      contractId: json.contractId,
      isPrimary: json.isPrimary,
      validUntil: json.validUntil,
      isActive: json.isActive,
      createdAt: json.createdAt,
    };
  }

  public assignReviewer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const dto: AssignReviewerDto = req.body;

    const reviewer = await this.assignReviewerToContractUseCase.execute({
      contractId: id,
      userId: dto.userId,
      isPrimary: dto.isPrimary,
      validUntil: dto.validUntil,
    });

    res.status(200).json({
      success: true,
      data: await this.toReviewerResponseDto(reviewer),
      message: 'Reviewer assigned successfully',
    });
  });

  public removeReviewer = asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params;

    await this.removeReviewerFromContractUseCase.execute({
      contractId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Reviewer removed successfully',
    });
  });

  public getReviewers = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { activeOnly } = req.query;

    const reviewers = await this.getContractReviewersUseCase.execute(
      id,
      activeOnly === 'true',
    );

    res.status(200).json({
      success: true,
      data: await Promise.all(reviewers.map((reviewer: ContractReviewer) => this.toReviewerResponseDto(reviewer))),
      count: reviewers.length,
    });
  });

  public updateReviewer = asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params;
    const dto: UpdateReviewerDto = req.body;

    const reviewer = await this.updateReviewerUseCase.execute({
      contractId: id,
      userId,
      isPrimary: dto.isPrimary,
      validUntil: dto.validUntil,
    });

    res.status(200).json({
      success: true,
      data: await this.toReviewerResponseDto(reviewer),
      message: 'Reviewer updated successfully',
    });
  });

  // Colaborator management methods
  public addColaborator = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { colaboratorId } = req.body;

    if (!colaboratorId) {
      throw new ValidationError('Colaborator ID is required', 'colaboratorId');
    }

    await this.addColaboratorToContractUseCase.execute(id, colaboratorId);
    res.status(200).json({ success: true, message: 'Colaborator added successfully' });
  });

  public removeColaborator = asyncHandler(async (req: Request, res: Response) => {
    const { id, colaboratorId } = req.params;
    await this.removeColaboratorFromContractUseCase.execute(id, colaboratorId);
    res.status(200).json({ success: true, message: 'Colaborator removed successfully' });
  });

  public getColaborators = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const colaborators = await this.getContractColaboratorsUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: colaborators.map((c: Colaborator) => c.toJSON()),
      count: colaborators.length,
    });
  });

  public getDocumentStructure = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { familyId, documentTypeId, documentSubtypeId, status } = req.query as Record<string, string>;
    const items = await this.getContractDocumentStructureUseCase.execute(id, {
      familyId,
      documentTypeId,
      documentSubtypeId,
      status: status as 'complete' | 'incomplete' | undefined,
    });
    res.status(200).json({ success: true, data: items, count: items.length });
  });
}
