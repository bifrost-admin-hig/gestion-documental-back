import { Request, Response } from 'express';
import { AssignRoleToUserUseCase } from '@domains/user/use-cases/assign-role-to-user.use-case';
import { CreateUserUseCase } from '@domains/user/use-cases/create-user.use-case';
import { GetUserByIdUseCase, GetAllUsersUseCase } from '@domains/user/use-cases/get-user.use-case';
import { UpdateUserUseCase, DeleteUserUseCase } from '@domains/user/use-cases/update-user.use-case';
import { SendActivationEmailUseCase } from '@domains/user/use-cases/send-activation-email.use-case';
import { asyncHandler } from '@shared/middleware/validation';
import { ForbiddenError } from '@shared/domain/errors';
import { isRbacEnabled } from '@shared/utils/requests';
import { UserStatus } from '@domains/user/value-objects/user-status';

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly getAllUsersUseCase: GetAllUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    public readonly assignRoleToUserUseCase: AssignRoleToUserUseCase,
    private readonly sendActivationEmailUseCase: SendActivationEmailUseCase,
  ) {}

  public createUser = asyncHandler(async (req: Request, res: Response) => {
    const { groupId, user: currentUser } = req.auth;

    // Logica para asignacion de grupos:
    // 1. Si el creador tiene un grupo seleccionado, ese grupo se asigna al nuevo usuario.
    // 2. Si no posee ningun grupo, debe tener permiso 'user:empty:group'.
    // 3. De lo contrario, tiene prohibido crear usuarios.

    if (isRbacEnabled(req) && !groupId && !currentUser?.can('user:empty:group')) {
      throw new ForbiddenError('You must have a group selected to create users, or have the "user:empty:group" permission.');
    }

    const user = await this.createUserUseCase.execute({ ...req.body, groupId });

    res.status(201).json({
      success: true,
      data: user.toJSON(),
      message: 'User created successfully',
    });
  });

  public getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await this.getUserByIdUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: user.toJSON(),
    });
  });

  public getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.auth;
    const users = await this.getAllUsersUseCase.execute(groupId);
    res.status(200).json({
      success: true,
      data: users.map(user => user.toJSON()),
      count: users.length,
    });
  });

  public updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUserId = req.auth?.user?.id;

    if (req.body.status !== undefined && currentUserId === id) {
      throw new ForbiddenError('You cannot change your own status');
    }

    const previousUser = await this.getUserByIdUseCase.execute(id);
    const user = await this.updateUserUseCase.execute({ id, ...req.body });

    // Send activation email when a user is activated for the first time (unless explicitly skipped)
    let emailWarning: string | undefined;
    const skipEmail = req.body.skipEmail === true;
    if (
      !skipEmail &&
      req.body.status === UserStatus.ACTIVE &&
      previousUser?.status !== UserStatus.ACTIVE
    ) {
      try {
        await this.sendActivationEmailUseCase.execute(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.warn('Failed to send activation email', { userId: id, error: message });
        emailWarning = 'No se pudo enviar el correo de activación. Verifique la configuración del servidor de correo.';
      }
    }

    res.status(200).json({
      success: true,
      data: user.toJSON(),
      message: 'User updated successfully',
      ...(emailWarning ? { emailWarning } : {}),
    });
  });

  public deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteUserUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  });

  public assignRoleToUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { roleIds } = req.body;
    const currentUser = req.auth.user!;
    const user = await this.assignRoleToUserUseCase.execute({ userId: id, roleIds, currentUser });
    res.status(200).json({
      success: true,
      data: user,
      message: 'Role assigned to user successfully',
    });
  });
}
