import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  const appServiceMock = {
    getLandingData: jest.fn().mockReturnValue({}),
    getUsers: jest.fn().mockReturnValue([]),
    getDestinations: jest.fn().mockReturnValue([]),
    getAchievements: jest.fn().mockReturnValue([]),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appServiceMock }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  it('should return landing data from the service', () => {
    expect(appController.getLandingData()).toEqual({});
    expect(appServiceMock.getLandingData).toHaveBeenCalled();
  });
});
