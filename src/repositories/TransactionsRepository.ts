import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const incomeData = transactions
      .filter(transaction => transaction.type === 'income')
      .reduce((acc, t) => acc + t.value, 0);

    const outcomeData = transactions
      .filter(transaction => transaction.type === 'outcome')
      .reduce((acc, t) => acc + t.value, 0);

    const result = incomeData - outcomeData;

    return {
      income: incomeData,
      outcome: outcomeData,
      total: result,
    };
  }
}

export default TransactionsRepository;
