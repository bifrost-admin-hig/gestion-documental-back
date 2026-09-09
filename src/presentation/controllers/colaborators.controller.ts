import { Request, Response } from 'express';
import { CreateColaboratorUseCase } from '@domains/colaborators/use-cases/create-colaborator.use-case';
import { GetColaboratorUseCase } from '@domains/colaborators/use-cases/get-colaborator.use-case';
import { UpdateColaboratorUseCase, DeleteColaboratorUseCase } from '@domains/colaborators/use-cases/update-colaborator.use-case';
import { GetColaboratorGroupsUseCase } from '@domains/colaborators/use-cases/get-colaborator-groups.use-case';
import { CreateColaboratorDto } from '@presentation/dto/colaborator/create-colaborator.dto';
import { UpdateColaboratorDto } from '@presentation/dto/colaborator/update-colaborator.dto';
import { toColaboratorResponseDto } from '@presentation/dto/colaborator/colaborator-response.dto';
import { asyncHandler } from '@shared/middleware/validation';
import { UpdateColaboratorContractsUseCase } from '@domains/colaborators/use-cases/update-colaborator-contracts.use-case';
import { GetContractsByColaboratorUseCase } from '@domains/contract/use-cases/get-contracts-by-colaborator.use-case';
import { toContractResponseDto } from '@presentation/dto/contract/contract-response.dto';
import { ValidationError } from '@shared/domain/errors';
import { LinkUserToColaboratorUseCase } from '@domains/colaborators/use-cases/link-user-to-colaborator.use-case';

export class ColaboratorController {
  constructor(
    private readonly createColaboratorUseCase: CreateColaboratorUseCase,
    private readonly getColaboratorUseCase: GetColaboratorUseCase,
    private readonly updateColaboratorUseCase: UpdateColaboratorUseCase,
    private readonly deleteColaboratorUseCase: DeleteColaboratorUseCase,
    private readonly getColaboratorGroupsUseCase: GetColaboratorGroupsUseCase,
    private readonly updateColaboratorContractsUseCase: UpdateColaboratorContractsUseCase,
    private readonly getContractsByColaboratorUseCase: GetContractsByColaboratorUseCase,
    private readonly linkUserToColaboratorUseCase: LinkUserToColaboratorUseCase,
  ) {}

  public createColaborator = asyncHandler(async (req: Request, res: Response) => {
    const dto: CreateColaboratorDto = req.body;
    const colaboratorRequest = {
      ...dto,
      fechaNacimiento: new Date(dto.fechaNacimiento),
    };

    const colaborator = await this.createColaboratorUseCase.execute(colaboratorRequest);
    res.status(201).json({
      success: true,
      data: toColaboratorResponseDto(colaborator),
      message: 'Colaborator created successfully',
    });
  });

  public getColaboratorById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const colaborator = await this.getColaboratorUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: toColaboratorResponseDto(colaborator),
    });
  });

  public getAllColaborators = asyncHandler(async (req: Request, res: Response) => {
    const { filter } = req.query;
    const { groupId } = req.auth;
    const filters: any = {};
    if (filter && typeof filter === 'object') {
      const contractId = (filter as any).contractId;
      if (contractId && contractId !== 'undefined' && contractId !== 'null' && contractId.trim() !== '') {
        filters.contractId = contractId;
      }
    }

    const colaborators = await this.getColaboratorUseCase.getAll(groupId, Object.keys(filters).length > 0 ? filters : undefined);
    res.status(200).json({
      success: true,
      data: colaborators.map((colaborator: any) => toColaboratorResponseDto(colaborator)),
      count: colaborators.length,
    });
  });

  public getColaboratorByDocumentNumber = asyncHandler(async (req: Request, res: Response) => {
    const { numeroDocumento } = req.params;
    const colaborator = await this.getColaboratorUseCase.getByDocumentNumber(numeroDocumento);
    res.status(200).json({
      success: true,
      data: toColaboratorResponseDto(colaborator),
    });
  });

  public getColaboratorByEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.params;
    const colaborator = await this.getColaboratorUseCase.getByEmail(email);
    res.status(200).json({
      success: true,
      data: toColaboratorResponseDto(colaborator),
    });
  });

  public getActiveColaborators = asyncHandler(async (req: Request, res: Response) => {
    const colaborators = await this.getColaboratorUseCase.getActiveColaborators();
    res.status(200).json({
      success: true,
      data: colaborators.map((colaborator: any) => toColaboratorResponseDto(colaborator)),
      count: colaborators.length,
    });
  });

  public searchColaboratorsByName = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.query;
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Name parameter is required', 'name');
    }

    const colaborators = await this.getColaboratorUseCase.searchByName(name);
    res.status(200).json({
      success: true,
      data: colaborators.map((colaborator: any) => toColaboratorResponseDto(colaborator)),
      count: colaborators.length,
    });
  });

  public updateColaborator = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const dto: UpdateColaboratorDto = req.body;

    // Convert fechaNacimiento string to Date if provided
    const updateRequest: any = { id, ...dto };
    if (dto.fechaNacimiento) {
      updateRequest.fechaNacimiento = new Date(dto.fechaNacimiento);
    }

    const colaborator = await this.updateColaboratorUseCase.execute(updateRequest);

    res.status(200).json({
      success: true,
      data: toColaboratorResponseDto(colaborator),
      message: 'Colaborator updated successfully',
    });
  });

  public activateColaborator = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const colaborator = await this.updateColaboratorUseCase.activate(id);
    res.status(200).json({
      success: true,
      data: toColaboratorResponseDto(colaborator),
      message: 'Colaborator activated successfully',
    });
  });

  public suspendColaborator = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const colaborator = await this.updateColaboratorUseCase.suspend(id);
    res.status(200).json({
      success: true,
      data: toColaboratorResponseDto(colaborator),
      message: 'Colaborator suspended successfully',
    });
  });

  public deactivateColaborator = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const colaborator = await this.updateColaboratorUseCase.deactivate(id);
    res.status(200).json({
      success: true,
      data: toColaboratorResponseDto(colaborator),
      message: 'Colaborator deactivated successfully',
    });
  });

  public terminateColaborator = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const colaborator = await this.updateColaboratorUseCase.terminate(id);
    res.status(200).json({
      success: true,
      data: toColaboratorResponseDto(colaborator),
      message: 'Colaborator terminated successfully',
    });
  });

  public getColaboratorGroups = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const groups = await this.getColaboratorGroupsUseCase.execute(id);
    res.status(200).json({
      success: true,
      data: groups.map(g => g.toJSON()),
      count: groups.length,
    });
  });

  public updateColaboratorContracts = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { contractIds } = req.body;

    await this.updateColaboratorContractsUseCase.execute({
      colaboratorId: id,
      contractIds,
    });

    res.status(200).json({
      success: true,
      message: 'Colaborator contracts updated successfully',
    });
  });

  public getColaboratorContracts = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const contracts = await this.getContractsByColaboratorUseCase.execute(id);

    res.status(200).json({
      success: true,
      data: contracts.map(contract => toContractResponseDto(contract)),
      count: contracts.length,
    });
  });

  public deleteColaborator = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteColaboratorUseCase.execute(id);
    res.status(200).json({
      success: true,
      message: 'Colaborator deleted successfully',
    });
  });

  public assignUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;
    const colaborator = await this.linkUserToColaboratorUseCase.execute(id, userId ?? null);
    res.status(200).json({
      success: true,
      data: toColaboratorResponseDto(colaborator),
      message: userId ? 'User assigned to colaborator successfully' : 'User unlinked from colaborator successfully',
    });
  });
}
