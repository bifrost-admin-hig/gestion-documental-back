import { Request, Response, NextFunction, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { LoginUserUseCase } from '@domains/user/use-cases/login-user.use-case';
import { GetUserByIdUseCase } from '@domains/user/use-cases/get-user.use-case';
import { UpdateUserUseCase } from '@domains/user/use-cases/update-user.use-case';
import { ChangePasswordUseCase } from '@domains/user/use-cases/change-password.use-case';
import { SetPasswordUseCase } from '@domains/user/use-cases/set-password.use-case';
import { SendPasswordResetEmailUseCase } from '@domains/user/use-cases/send-password-reset-email.use-case';
import { ResetPasswordUseCase } from '@domains/user/use-cases/reset-password.use-case';
import { ForbiddenError, UnauthorizedError, ValidationError } from '@shared/domain/errors';
import { GroupRepository } from '@domains/group/repositories/group.repository';
import { InAppNotificationRepository } from '@domains/notification/repositories/in-app-notification.repository';
import { InAppNotification } from '@domains/notification/entities/in-app-notification.entity';
import { DocumentRepository } from '@domains/document/repositories/document.repository';
import { SignatureStatus } from '@domains/signature/value-objects/signature-enums';

export class AuthController {
  constructor(
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly groupRepository: GroupRepository,
    private readonly inAppNotificationRepository: InAppNotificationRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly setPasswordUseCase: SetPasswordUseCase,
    private readonly sendPasswordResetEmailUseCase: SendPasswordResetEmailUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly jwtSecret: string,
  ) {
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.getPermissions = this.getPermissions.bind(this);
    this.refresh = this.refresh.bind(this);
    this.getMe = this.getMe.bind(this);
    this.updateMe = this.updateMe.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.getToken = this.getToken.bind(this);
    this.getGroup = this.getGroup.bind(this);
    this.setPassword = this.setPassword.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.deleteNotification = this.deleteNotification.bind(this);
    this.clearNotifications = this.clearNotifications.bind(this);
  }

  private async canDeleteNotification(notification: InAppNotification): Promise<boolean> {
    if (notification.entityType !== 'document' || !notification.entityId) {
      return true;
    }

    const document = await this.documentRepository.findById(notification.entityId);
    if (!document) return true;

    return document.signatureStatus !== SignatureStatus.PENDING;
  }

  private async serializeNotifications(userId: string): Promise<Array<{
    id: string;
    title: string;
    message: string;
    entityType: string;
    entityId: string | null;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    canDelete: boolean;
  }>> {
    const notifications = await this.inAppNotificationRepository.findByUserId(userId);

    return Promise.all(notifications.map(async (notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      canDelete: await this.canDeleteNotification(notification),
    })));
  }

  private getCookieOptions(): CookieOptions {
    const secure = process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production';

    const sameSiteEnv = process.env.COOKIE_SAMESITE?.toLowerCase();
    const sameSite: CookieOptions['sameSite'] =
      sameSiteEnv === 'lax' || sameSiteEnv === 'strict' || sameSiteEnv === 'none'
        ? sameSiteEnv
        : 'strict';

    const maxAge = Number(process.env.COOKIE_MAX_AGE_MS || '3600000');

    return {
      httpOnly: true,
      secure,
      sameSite,
      maxAge,
    };
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError('Email and password are required', 'credentials');
      }

      const user = await this.loginUserUseCase.execute(email, password);

      // Generate JWT Token
      const token = jwt.sign(
        { userId: user.id, email: user.email.toString() },
        this.jwtSecret,
        { expiresIn: '1h' },
      );

      res.cookie('token', token, this.getCookieOptions());

      // Auto-assign group: Find the first group the user belongs to
      const userGroup = await this.groupRepository.findByUserId(user.id);
      if (userGroup && userGroup.id) {
        res.cookie('groupId', userGroup.id.toString(), this.getCookieOptions());
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: user.toJSON(),
          groupId: userGroup?.id ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const { maxAge: _maxAge, ...clearOptions } = this.getCookieOptions();
    res.clearCookie('token', clearOptions);
    res.clearCookie('groupId', clearOptions);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  }

  async getPermissions(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const user = req.auth?.user;
    if (!user) {
      throw new ValidationError('User not authenticated', 'authentication');
    }
    const permissions = user.getPermissionNames(true);
    res.status(200).json({
      success: true,
      data: { permissions },
    });
  }

  async refresh(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const user = req.auth?.user;
    if (!user) {
      throw new ValidationError('User not authenticated', 'authentication');
    }

    // Generate new JWT Token
    const token = jwt.sign(
      { userId: user.id, email: user.email.toString() },
      this.jwtSecret,
      { expiresIn: '1h' },
    );

    res.cookie('token', token, this.getCookieOptions());

    // Auto-assign group: Find the first group the user belongs to
    const userGroup = await this.groupRepository.findByUserId(user.id);
    if (userGroup && userGroup.id) {
      res.cookie('groupId', userGroup.id.toString(), this.getCookieOptions());
    }

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token },
    });
  }

  async getMe(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const user = req.auth?.user;
    if (!user) {
      throw new ValidationError('User not authenticated', 'authentication');
    }

    const permissions = user.getPermissionNames(true);
    const inAppNotifications = await this.serializeNotifications(user.id);

    // Get user's group
    const userGroup = await this.groupRepository.findByUserId(user.id);

    // Prepare group data without users (for privacy/permission reasons)
    const groupData = userGroup ? {
      id: userGroup.id,
      name: userGroup.name,
      description: userGroup.description,
      createdAt: userGroup.createdAt,
      updatedAt: userGroup.updatedAt,
    } : null;

    // Get selected group from request (set by middleware from cookie)
    const selectedGroup = userGroup && userGroup.id === req.auth?.groupId
      ? groupData
      : null;

    res.status(200).json({
      success: true,
      data: {
        ...user.toJSON(),
        permissions,
        in_app_notifications: inAppNotifications,
        groups: groupData ? [groupData] : [],
        selectedGroup,
      },
    });
  }

  async deleteNotification(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const user = req.auth?.user;
    if (!user) {
      throw new ValidationError('User not authenticated', 'authentication');
    }

    const notificationId = req.params.id;
    if (!notificationId) {
      throw new ValidationError('Notification id is required', 'id');
    }

    const notifications = await this.inAppNotificationRepository.findByUserId(user.id);
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification) {
      throw new ValidationError('Notification not found', 'id');
    }

    const canDelete = await this.canDeleteNotification(notification);
    if (!canDelete) {
      throw new ForbiddenError('Cannot delete notifications for pending document signatures');
    }

    await this.inAppNotificationRepository.deleteById(notificationId, user.id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      data: { id: notificationId },
    });
  }

  async clearNotifications(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const user = req.auth?.user;
    if (!user) {
      throw new ValidationError('User not authenticated', 'authentication');
    }

    const notifications = await this.inAppNotificationRepository.findByUserId(user.id);
    const evaluation = await Promise.all(notifications.map(async (notification) => ({
      id: notification.id,
      canDelete: await this.canDeleteNotification(notification),
    })));

    const deletableIds = evaluation.filter((item) => item.canDelete).map((item) => item.id);
    const blockedCount = evaluation.length - deletableIds.length;
    const deletedCount = await this.inAppNotificationRepository.deleteByIds(deletableIds, user.id);

    res.status(200).json({
      success: true,
      message: 'Notifications cleaned successfully',
      data: {
        deletedCount,
        blockedCount,
      },
    });
  }

  async updateMe(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const user = req.auth?.user;
    if (!user) {
      throw new ValidationError('User not authenticated', 'authentication');
    }

    const updatedUser = await this.updateUserUseCase.execute({
      id: user.id,
      ...req.body,
    });

    res.status(200).json({
      message: 'User updated successfully',
      data: updatedUser.toJSON(),
      success: true,
    });
  }

  async getToken(req: Request, res: Response, _next: NextFunction): Promise<void> {
    // Get token from cookie
    const cookieHeader = req.headers.cookie;
    let token: string | null = null;

    if (cookieHeader && typeof cookieHeader === 'string') {
      const pairs = cookieHeader.split(';');
      const names = ['token', 'jwt', 'access_token'];
      for (const name of names) {
        const match = pairs.find(p => p.trim().startsWith(`${name}=`));
        if (match) {
          const value = match.split('=')[1];
          if (value) {
            token = decodeURIComponent(value.trim());
            break;
          }
        }
      }
    }

    if (!token) throw new UnauthorizedError('No token found');

    res.status(200).json({
      success: true,
      data: { token },
    });
  }

  async getGroup(req: Request, res: Response, _next: NextFunction): Promise<void> {
    // Get groupId from cookie
    const cookieHeader = req.headers.cookie;
    let groupId: string | null = null;

    if (cookieHeader && typeof cookieHeader === 'string') {
      const pairs = cookieHeader.split(';');
      const match = pairs.find(p => p.trim().startsWith('groupId='));
      if (match) {
        const value = match.split('=')[1];
        if (value) {
          groupId = decodeURIComponent(value.trim());
        }
      }
    }

    if (!groupId) {
      res.status(200).json({
        success: true,
        data: { groupId: null },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { groupId: parseInt(groupId) },
    });
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.auth?.user;
      if (!user) {
        throw new ValidationError('User not authenticated', 'authentication');
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required', 'passwords');
      }

      await this.changePasswordUseCase.execute({
        userId: user.id,
        currentPassword,
        newPassword,
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async setPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new ValidationError('Token and new password are required', 'body');
      }

      await this.setPasswordUseCase.execute(token, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password set successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        throw new ValidationError('Email is required', 'email');
      }

      await this.sendPasswordResetEmailUseCase.execute(email);

      // Respuesta siempre genérica: no revela si el correo existe, está
      // inactivo o si el envío falló, para evitar enumeración de usuarios.
      res.status(200).json({
        success: true,
        message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new ValidationError('Token and new password are required', 'body');
      }

      await this.resetPasswordUseCase.execute(token, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
