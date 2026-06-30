import {
  Get,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import {
  ApiGetAdminUser,
  ApiGetAdminUsers,
  ApiUpdateUserPermissions,
} from '../docs/admin-user-api.docs';

import { UserService } from '../services/user.service';

import { PaginatedResult } from '@/common/types/paginated.type';
import { AdminUserResponseDto } from '../dto/admin-user-response.dto';
import { FindAdminUsersQueryDto } from '../dto/find-admin-users-query.dto';
import { UpdateUserPermissionsDto } from '../dto/update-user-permissions.dto';

@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiGetAdminUsers()
  async findAll(
    @Query() query: FindAdminUsersQueryDto,
  ): Promise<PaginatedResult<AdminUserResponseDto>> {
    const result = await this.userService.findAllForAdmin(query);

    return {
      items: AdminUserResponseDto.fromEntities(result.items),
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiGetAdminUser()
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminUserResponseDto> {
    const user = await this.userService.findOneForAdmin(id);

    return AdminUserResponseDto.fromEntity(user);
  }

  @Patch(':id/permissions')
  @ApiUpdateUserPermissions()
  async updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserPermissionsDto,
  ): Promise<AdminUserResponseDto> {
    const user = await this.userService.updatePermissions(id, dto);

    return AdminUserResponseDto.fromEntity(user);
  }
}
