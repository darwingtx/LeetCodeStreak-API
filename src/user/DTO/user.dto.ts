import { IsUUID } from 'class-validator';

export class UserIdDto {
  @IsUUID('4', { message: 'The provided ID is not a valid UUID' })
  id: string;
}
