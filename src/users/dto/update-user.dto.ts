import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEmpty } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsEmpty() id?: number;
  name: string;
  managementOf: string;
  email: string;
  phone: string;
}
