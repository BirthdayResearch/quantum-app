import { Module } from '@nestjs/common';

import { SettingsController } from './SettingsController';

@Module({
  controllers: [SettingsController],
})
export class SettingsModule {}
