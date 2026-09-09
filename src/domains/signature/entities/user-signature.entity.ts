import { EntityUtils } from '@shared/utils/common';
import { ValidationError } from '@shared/domain/errors';

export interface UserSignatureProps {
  id?: string;
  userId?: string | null;
  colaboratorId?: string | null;
  fileId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Firma dibujada guardada por un firmante (usuario interno o colaborador externo) para reutilizar sin volver a dibujar. */
export class UserSignature {
  id: string;
  userId: string | null;
  colaboratorId: string | null;
  fileId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: UserSignatureProps) {
    UserSignature.validateRequired(props);

    EntityUtils.assign(this as UserSignature, props, {
      id: 'uuid',
      userId: (v?: string | null) => v ?? null,
      colaboratorId: (v?: string | null) => v ?? null,
      createdAt: 'datetime',
      updatedAt: 'datetime',
    });
  }

  static create(props: UserSignatureProps): UserSignature {
    return new UserSignature(props);
  }

  private static validateRequired(props: UserSignatureProps): void {
    if (!props.fileId) {
      throw new ValidationError('El ID del archivo de la firma es requerido');
    }
    if (!props.userId && !props.colaboratorId) {
      throw new ValidationError('La firma guardada debe pertenecer a un usuario o a un colaborador');
    }
    if (props.userId && props.colaboratorId) {
      throw new ValidationError('La firma guardada no puede pertenecer a un usuario y a un colaborador a la vez');
    }
  }
}
