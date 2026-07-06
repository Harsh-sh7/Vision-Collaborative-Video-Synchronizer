import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { generateToken, verifyToken } from '../shared/auth';
import { v4 as uuidv4 } from 'uuid';

@Controller('api/v1')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // Profile Onboarding (Authentication)
  @Post('auth/register')
  register(@Body('displayName') displayName: string) {
    if (!displayName || !displayName.trim()) {
      throw new UnauthorizedException('Display name is required');
    }
    const userId = uuidv4();
    const token = generateToken({ userId, displayName });
    return {
      token,
      user: { id: userId, displayName },
    };
  }

  // Create Room
  @Post('rooms')
  createRoom(
    @Headers('authorization') authHeader: string,
    @Body('collaborativeMode') collaborativeMode?: boolean
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid or missing authentication token');
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token signature');
    }

    const room = this.roomsService.createRoom(payload.userId, payload.displayName);
    if (collaborativeMode !== undefined) {
      room.collaborativeMode = collaborativeMode;
    }

    return {
      roomId: room.roomId,
      roomCode: room.roomCode,
      inviteUrl: `http://localhost:3000/join/${room.roomCode}`,
    };
  }

  // Verify Room Code
  @Get('rooms/verify/:roomCode')
  verifyRoom(@Param('roomCode') roomCode: string) {
    const room = this.roomsService.getRoomByCode(roomCode);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return {
      valid: true,
      roomId: room.roomId,
      isLocked: room.isLocked,
    };
  }
}
