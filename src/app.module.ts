import { Module } from '@nestjs/common';
import { GroupModule } from './group/group.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';


@Module({
  imports: [GroupModule, AuthModule, UserModule],
})
export class AppModule {}
