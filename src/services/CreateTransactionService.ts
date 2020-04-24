import { getCustomRepository } from 'typeorm';

import TransactionRepository from '../repositories/TransactionsRepository';
import CategoryRepository from '../repositories/CategoriesRepository';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryRepository = getCustomRepository(CategoryRepository);

    const { total } = await transactionRepository.getBalance();

    if (type === 'outcome' && total < value) {
      throw new AppError('Insuficient balance');
    }

    let categoryExists = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!categoryExists) {
      categoryExists = categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(categoryExists);
    }

    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category: categoryExists,
    });

    await transactionRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
