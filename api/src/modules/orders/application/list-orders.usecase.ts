import type { OrderRepository, OrderStatus } from "../domain/index.js";

import { toOrderOutput, type OrderOutput } from "./order.presenter.js";

export type ListOrdersInput = {
  participantId: string;
  status?: OrderStatus;
  limit?: number;
};

export type ListOrdersOutput = {
  items: OrderOutput[];
};

export type ListOrdersDeps = {
  orderRepository: OrderRepository;
};

export class ListOrdersUseCase {
  constructor(private readonly deps: ListOrdersDeps) {}

  async execute(input: ListOrdersInput): Promise<ListOrdersOutput> {
    const orders = await this.deps.orderRepository.search({
      participantId: input.participantId,
      status: input.status,
      limit: input.limit,
    });

    return {
      items: orders.map(toOrderOutput),
    };
  }
}
