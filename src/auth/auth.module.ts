import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";

import { GUARDS } from "./guards";
import { STRATEGIES } from "./strategies";
import { options } from "./config";
import { UserModule } from "@user/user.module";

@Module({
  providers: [...STRATEGIES, ...GUARDS],
  imports: [UserModule, PassportModule, JwtModule.registerAsync(options())],
})
export class AuthModule {}
