import { Request, Response } from 'express';
import { CreateCompanyUseCase } from '@domains/company/use-cases/create-company.use-case';
import { UpdateCompanyUseCase } from '@domains/company/use-cases/update-company.use-case';
import { DeleteCompanyUseCase } from '@domains/company/use-cases/delete-company.use-case';
import { GetCompanyUseCase } from '@domains/company/use-cases/get-company.use-case';
import { ListCompaniesUseCase } from '@domains/company/use-cases/list-companies.use-case';
import { CreateCompanyDto } from '../../dto/company/create-company.dto';
import { UpdateCompanyDto } from '../../dto/company/update-company.dto';

export class CompanyController {
  constructor(
    private readonly createCompanyUseCase: CreateCompanyUseCase,
    private readonly updateCompanyUseCase: UpdateCompanyUseCase,
    private readonly deleteCompanyUseCase: DeleteCompanyUseCase,
    private readonly getCompanyUseCase: GetCompanyUseCase,
    private readonly listCompaniesUseCase: ListCompaniesUseCase,
  ) {}

  public create = async (req: Request, res: Response) => {
    const dto = req.body as CreateCompanyDto;
    const company = await this.createCompanyUseCase.execute(dto);

    res.status(201).json({
      success: true,
      data: company.toJSON(),
    });
  };

  public update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const dto = req.body as UpdateCompanyDto;

    const company = await this.updateCompanyUseCase.execute({
      ...dto,
      id,
    });

    res.status(200).json({
      success: true,
      data: company.toJSON(),
    });
  };

  public delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deleteCompanyUseCase.execute(id);

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully',
    });
  };

  public findById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const company = await this.getCompanyUseCase.execute(id);

    res.status(200).json({
      success: true,
      data: company.toJSON(),
    });
  };

  public findAll = async (req: Request, res: Response) => {
    // Si el usuario tiene un grupo seleccionado (req.auth.groupId), solo listamos las de ese grupo
    // Si no, y tiene permisos de admin, podría listar todas o filtrar por query param.
    // Por requerimiento nos enfocamos en usuarios con grupo asignado.
    const groupId = req.auth?.groupId;
    const companies = await this.listCompaniesUseCase.execute(groupId);

    res.status(200).json({
      success: true,
      data: companies.map(c => c.toJSON()),
    });
  };
}
