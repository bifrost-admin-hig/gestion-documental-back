import { Request, Response } from 'express';
import { CreateGroupUseCase, GetAllGroupsUseCase } from '@domains/group/use-cases/create-group.use-case';
import { GetGroupByIdUseCase } from '@domains/group/use-cases/get-group.use-case';
import { UpdateGroupUseCase, DeleteGroupUseCase } from '@domains/group/use-cases/update-group.use-case';
import { AddUserToGroupUseCase, RemoveUserFromGroupUseCase, AssignGroupToUserUseCase } from '@domains/group/use-cases/manage-group-users.use-case';
import { asyncHandler } from '@shared/middleware/validation';
import { NotFoundError, ForbiddenError } from '@shared/domain/errors';

export class GroupController {
  constructor(
    public readonly createGroupUseCase: CreateGroupUseCase,
    public readonly getGroupByIdUseCase: GetGroupByIdUseCase,
    public readonly getAllGroupsUseCase: GetAllGroupsUseCase,
    public readonly updateGroupUseCase: UpdateGroupUseCase,
    public readonly deleteGroupUseCase: DeleteGroupUseCase,
    public readonly addUserToGroupUseCase: AddUserToGroupUseCase,
    public readonly removeUserFromGroupUseCase: RemoveUserFromGroupUseCase,
    public readonly assignGroupToUserUseCase: AssignGroupToUserUseCase,
  ) { }

  public createGroup = asyncHandler(async (req: Request, res: Response) => {
    const { user, permissions = [] } = req.auth;
    const { groups = [] } = user || {};
    const permission = permissions.includes('group:create') ? 'group:create' : 'group:owner';

    if (permission === 'group:owner' && groups?.length) {
      throw new ForbiddenError('El usuario ya pertenece a un grupo');
    }

    const group = await this.createGroupUseCase.execute(req.body);

    // Auto asignar grupo si el usuario tiene permiso de group:owner
    if (permission === 'group:owner' && group?.id) {
      await this.addUserToGroupUseCase.execute(group.id, user!.id, 'group:owner');
    }

    res.status(201).json({
      success: true,
      data: group.toJSON(),
      message: 'Group created successfully',
    });
  });

  public getGroupById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const group = await this.getGroupByIdUseCase.execute(Number(id));

    if (!group) throw new NotFoundError('Group', id);

    res.status(200).json({
      success: true,
      data: group.toJSON(),
    });
  });

  public getAllGroups = asyncHandler(async (req: Request, res: Response) => {
    const groups = await this.getAllGroupsUseCase.execute();
    res.status(200).json({
      success: true,
      data: groups.map(g => g.toJSON()),
      count: groups.length,
    });
  });

  public updateGroup = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const group = await this.updateGroupUseCase.execute({ id: Number(id), ...req.body });
    res.status(200).json({
      success: true,
      data: group.toJSON(),
      message: 'Group updated successfully',
    });
  });

  public deleteGroup = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteGroupUseCase.execute(Number(id));
    res.status(200).json({
      success: true,
      message: 'Group deleted successfully',
    });
  });

  public addUserToGroup = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;

    // Get user permissions from request (set by auth middleware)
    const userPermissions = req.auth?.permissions || [];
    const permission = userPermissions.includes('user:change:group')
      ? 'user:change:group'
      : 'group:assign:user';

    await this.addUserToGroupUseCase.execute(Number(id), userId, permission);
    res.status(200).json({
      success: true,
      message: 'User added to group successfully',
    });
  });

  public removeUserFromGroup = asyncHandler(async (req: Request, res: Response) => {
    const { id, userId } = req.params;
    await this.removeUserFromGroupUseCase.execute(Number(id), userId);
    res.status(200).json({
      success: true,
      message: 'User removed from group successfully',
    });
  });

  public assignGroupToUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { groupId } = req.body;

    // Get user permissions from request (set by auth middleware)
    const userPermissions = req.auth?.permissions || [];
    const permission = userPermissions.includes('user:change:group')
      ? 'user:change:group'
      : 'group:assign:user';

    await this.addUserToGroupUseCase.execute(groupId, userId, permission);

    res.status(200).json({
      success: true,
      message: 'Group assigned to user successfully',
    });
  });
}
