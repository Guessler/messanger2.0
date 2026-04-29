import { PartialType } from '@nestjs/swagger';
import { RegisterDto } from './auth.dto';

export class UpdateAuthDto extends PartialType(RegisterDto) {}
