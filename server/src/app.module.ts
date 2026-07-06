import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomsModule } from './rooms/rooms.module';
import { RoomGateway } from './gateway/room.gateway';

@Module({
  imports: [RoomsModule],
  controllers: [AppController],
  providers: [AppService, RoomGateway],
})
export class AppModule {}
