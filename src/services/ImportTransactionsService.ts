import csvParse from 'csv-parse';
import { getCustomRepository, In } from 'typeorm';
import fs from 'fs';

import CategoriesRepository from '../repositories/CategoriesRepository';
import TransactionRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CVSTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const categoryRepository = getCustomRepository(CategoriesRepository);
    const transactionRepository = getCustomRepository(TransactionRepository);

    const readStream = fs.createReadStream(filePath);

    const parser = csvParse({
      from_line: 2,
    });

    const parseCSV = readStream.pipe(parser);

    const transactions: CVSTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const exsitentCategoriesTitle = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitle = categories
      .filter(category => !exsitentCategoriesTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoryTitle.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);
    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
