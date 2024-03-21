import { Module } from "@nestjs/common";

import { UserService } from "./user.service";

@Module({
  exports: [UserService],
  providers: [UserService],
  imports: [],
})
export class UserModule {}
