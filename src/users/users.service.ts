import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UserIF } from 'src/mongoose/userIF';
import { comparePassword, generateUserPassword } from './helpers/bcrypt';
import { loginIF } from './interfaces/LoginIF';
import { generateAuthToken } from '../auth/helpers/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('user') private readonly userModule: Model<UserIF>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const { email } = createUserDto;
      const userFromDb = await this.userModule.findOne({ email });
      if (userFromDb)
        throw new Error('There is already a user with such an email');

      const newUser = new this.userModule(createUserDto);
      const encryptedPassword = generateUserPassword(createUserDto.password);

      newUser.password = encryptedPassword;
      newUser.isAdmin = false;

      await newUser.save();
      await this.cacheManager.reset();
      return newUser;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async login(userFromClient: loginIF) {
    try {
      const { email, password: passwordFromClient } = userFromClient;

      const userFromDb = await this.userModule.findOne({ email });
      if (!userFromDb) throw new Error('Invalid email');

      const { _id, isAdmin, password: passwordFromDB } = userFromDb;

      const validPassword = comparePassword(passwordFromClient, passwordFromDB);

      if (!validPassword) throw new Error('Invalid password');

      const token = generateAuthToken({ _id, isAdmin });
      return token;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async findAll() {
    const users = this.userModule.find().exec();
    const result = (await users).map(
      ({ id, name, email, phone, isAdmin, managementOf }) => ({
        id,
        name,
        email,
        phone,
        isAdmin,
        managementOf,
      }),
    );
    return result;
  }

  async findOne(id: string) {
    const user = await this.userModule.findById(id);
    if (!user) throw new Error(`There is no user with ID: ${id}`);
    const { _id, name, email, phone, isAdmin, managementOf } = user;
    return { id: _id, name, email, phone, isAdmin, managementOf };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModule.findById(id);
    const { name, email, phone, managementOf } = updateUserDto;
    user.name = name;
    user.email = email;
    user.phone = phone;
    user.managementOf = managementOf;
    await user.save();
    await this.cacheManager.reset();
    return user;
  }

  async removeByID(id: string) {
    const user = await this.userModule.findById(id);
    if (!user) throw new Error();
    await this.userModule.deleteOne({ _id: id }).exec();
    await this.cacheManager.reset();
    return `This action removes #${id} user`;
  }

  async removeAll() {
    await this.userModule.deleteMany();
    await this.cacheManager.reset();
    return `This action removes all users`;
  }
}
