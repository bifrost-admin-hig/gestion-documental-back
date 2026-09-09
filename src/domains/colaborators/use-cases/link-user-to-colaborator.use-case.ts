import { ColaboratorRepository } from '../repositories/colaborator.repository';
import { Colaborator } from '../entities/colaborator.entity';
import { DocumentType } from '../value-objects/colaborator-enums';
import { UserRepository } from '@domains/user/repositories/user.repository';
import { User } from '@domains/user/entities/user.entity';
import { NotFoundError, ConflictError } from '@shared/domain/errors';

export class LinkUserToColaboratorUseCase {
  constructor(
    private readonly colaboratorRepository: ColaboratorRepository,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Assigns a user to a colaborator (0..1:0..1).
   * Pass userId=null to unlink.
   */
  async execute(colaboratorId: string, userId: string | null): Promise<Colaborator> {
    const colaborator = await this.colaboratorRepository.findById(colaboratorId);
    if (!colaborator) {
      throw new NotFoundError(`Colaborador con id ${colaboratorId} no encontrado`);
    }

    if (userId === null) {
      colaborator.unlinkUser();
      return this.colaboratorRepository.update(colaborator);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`Usuario con id ${userId} no encontrado`);
    }

    const existingColaborator = await this.colaboratorRepository.findByUserId(userId);
    if (existingColaborator && existingColaborator.id !== colaboratorId) {
      throw new ConflictError('El usuario ya está vinculado a otro colaborador');
    }

    colaborator.linkUser(userId);
    const updatedColaborator = await this.colaboratorRepository.update(colaborator);

    try {
      await this.fillEmptyUserContactInfo(user, colaborator);
    } catch (error) {
      console.error(`Error completando datos de contacto del usuario ${user.id} al vincular colaborador ${colaboratorId}:`, error);
    }

    return updatedColaborator;
  }

  /**
   * Si el usuario no tiene rut/telefono cargados, se completan con los datos
   * del colaborador que se está vinculando (sin sobrescribir valores existentes).
   */
  private async fillEmptyUserContactInfo(user: User, colaborator: Colaborator): Promise<void> {
    const userUpdates: { rut?: string; phone?: string } = {};

    if (!user.rut && colaborator.tipoDocumento === DocumentType.RUT && colaborator.numeroDocumento) {
      userUpdates.rut = colaborator.numeroDocumento;
    }
    if (!user.phone && colaborator.telefono) {
      userUpdates.phone = colaborator.telefono;
    }

    if (Object.keys(userUpdates).length > 0) {
      await this.userRepository.update({ id: user.id, ...userUpdates });
    }
  }
}
