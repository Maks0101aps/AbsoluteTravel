import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

describe('FriendsController', () => {
  let service: jest.Mocked<FriendsService>;
  let controller: FriendsController;

  beforeEach(() => {
    service = {
      sendRequest: jest.fn(),
      accept: jest.fn(),
      incomingRequests: jest.fn(),
      search: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<FriendsService>;
    controller = new FriendsController(service);
  });

  it('sendRequest delegates to the service with the DTO', () => {
    const dto = { userId: 1, targetUserId: 2 };
    controller.sendRequest(dto);
    expect(service.sendRequest).toHaveBeenCalledWith(dto);
  });

  it('accept delegates with the parsed id and userId', () => {
    controller.accept(5, 1);
    expect(service.accept).toHaveBeenCalledWith(5, 1);
  });

  it('requests delegates with the userId query param', () => {
    controller.requests('1');
    expect(service.incomingRequests).toHaveBeenCalledWith('1');
  });

  it('search delegates with userId and query', () => {
    controller.search('1', 'trav');
    expect(service.search).toHaveBeenCalledWith('1', 'trav');
  });

  it('list delegates with the userId query param', () => {
    controller.list('1');
    expect(service.list).toHaveBeenCalledWith('1');
  });

  it('remove delegates with the parsed id and userId', () => {
    controller.remove(3, '1');
    expect(service.remove).toHaveBeenCalledWith(3, '1');
  });
});
