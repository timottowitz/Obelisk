import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// This configures a request mocking server for testing purposes
export const server = setupServer(...handlers);