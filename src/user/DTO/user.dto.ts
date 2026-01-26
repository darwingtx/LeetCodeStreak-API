import { IsUUID } from 'class-validator';

export class UserIdDto {
  @IsUUID('4', { message: 'El ID proporcionado no es un UUID válido' })
  id: string;
}
