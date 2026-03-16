import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleService } from './google.service';
import { GoogleKeyManagerService } from './google-key-manager.service';

describe('GoogleService', () => {
  let service: GoogleService;
  let keyManager: GoogleKeyManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleService,
        GoogleKeyManagerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<GoogleService>(GoogleService);
    keyManager = module.get<GoogleKeyManagerService>(GoogleKeyManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with API keys', () => {
    expect(keyManager.getTotalKeys()).toBeGreaterThan(0);
  });
});