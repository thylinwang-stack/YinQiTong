import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminLoginDto {
  @IsString()
  @MaxLength(80)
  username: string;

  @IsString()
  @MaxLength(200)
  password: string;
}

export class WechatLoginDto {
  @IsString()
  @MaxLength(200)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}
