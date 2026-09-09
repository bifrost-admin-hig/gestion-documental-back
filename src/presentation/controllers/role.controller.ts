import { Request, Response } from 'express';
import { SaveRoleUseCase } from '@domains/role/use-cases/save-role.use-case';
import { GetRoleByIdUseCase, GetAllRolesUseCase } from '@domains/role/use-cases/get-role.use-case';
import { UpdateRoleUseCase, DeleteRoleUseCase } from '@domains/role/use-cases/update-role.use-case';
import { AssignPermissionsToRoleUseCase } from '@domains/role/use-cases/assign-permissions-to-role.use-case';
import { asyncHandler } from '@shared/middleware/validation';
import { GetPermissionsToRoleUseCase } from '@domains/role/use-cases/get-permissions-to-role.use-case';

export class RoleController {
  constructor(
    public readonly saveRoleUseCase: SaveRoleUseCase,
    public readonly getRoleByIdUseCase: GetRoleByIdUseCase,
    public readonly getAllRolesUseCase: GetAllRolesUseCase,
    public readonly updateRoleUseCase: UpdateRoleUseCase,
    public readonly deleteRoleUseCase: DeleteRoleUseCase,
    public readonly assignPermissionsToRoleUseCase: AssignPermissionsToRoleUseCase,
    public readonly getPermissionsToRoleUseCase: GetPermissionsToRoleUseCase,
  ) {}

  public createRole = asyncHandler(async (req: Request, res: Response) => {
    const currentUser = req.auth.user!;
    const role = await this.saveRoleUseCase.execute({ ...req.body, currentUser });
    res.status(201).json({
      success: true,
      data: role.toJSON(),
      message: 'Role created successfully',
    });
  });

  public getRoleById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const role = await this.getRoleByIdUseCase.execute(Number(id));
    res.status(200).json({
      success: true,
      data: role.toJSON(),
    });
  });

  public getRoles = asyncHandler(async (req: Request, res: Response) => {
    const roles = await this.getAllRolesUseCase.execute();
    res.status(200).json({
      success: true,
      data: roles.map(r => r.toJSON()),
      count: roles.length,
    });
  });

  public updateRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { user: currentUser } = req.auth || {};
    const role = await this.updateRoleUseCase.execute({ id: Number(id), ...req.body, currentUser });
    res.status(200).json({
      success: true,
      data: role.toJSON(),
      message: 'Role updated successfully',
    });
  });

  public deleteRole = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteRoleUseCase.execute(Number(id));
    res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
    });
  });

  public assignPermissions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { permissionIds } = req.body;
    const currentUser = req.auth.user!;
    const role = await this.assignPermissionsToRoleUseCase.execute({ roleId: Number(id), permissionIds, currentUser });
    res.status(200).json({
      success: true,
      data: role.toJSON(),
      message: 'Permissions assigned successfully',
    });
  });

  public getPermissions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const permissions = await this.getPermissionsToRoleUseCase.execute(Number(id));
    res.status(200).json({
      success: true,
      data: permissions,
    });
  });
}
