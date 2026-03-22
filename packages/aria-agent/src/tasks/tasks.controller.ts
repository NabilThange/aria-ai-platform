import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  Query,
  HttpException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Message, Task } from '@prisma/client';
import { AddTaskMessageDto } from './dto/add-task-message.dto';
import { MessagesService } from '../messages/messages.service';
import { GROQ_MODELS } from '../groq/groq.constants';
import { BYTEZ_MODELS } from '../bytez/bytez.constants';
import { GOOGLE_MODELS } from '../google/google.constants';
import { BytebotAgentModel } from 'src/agent/agent.types';

// Check for any Google API key (single or numbered)
const hasGoogleApiKey = (): boolean => {
  if (process.env.GOOGLE_API_KEY) return true;
  let keyIndex = 1;
  while (process.env[`GOOGLE_API_KEY_${keyIndex}`]) {
    return true;
  }
  return false;
};

// Check for any Groq API key (single or numbered)
const hasGroqApiKey = (): boolean => {
  if (process.env.GROQ_API_KEY) return true;
  let keyIndex = 1;
  while (process.env[`GROQ_API_KEY_${keyIndex}`]) {
    return true;
  }
  return false;
};

// Check for any Bytez API key (single or numbered)
const hasBytezApiKey = (): boolean => {
  if (process.env.BYTEZ_API_KEY) return true;
  let keyIndex = 1;
  while (process.env[`BYTEZ_API_KEY_${keyIndex}`]) {
    return true;
  }
  return false;
};

const googleApiKey = hasGoogleApiKey();
const groqApiKey = hasGroqApiKey();
const bytezApiKey = hasBytezApiKey();

const models = [
  ...(groqApiKey ? GROQ_MODELS : []),
  ...(bytezApiKey ? BYTEZ_MODELS : []),
  ...(googleApiKey ? GOOGLE_MODELS : []),
];

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly messagesService: MessagesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('statuses') statuses?: string,
  ): Promise<{ tasks: Task[]; total: number; totalPages: number }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    // Handle both single status and multiple statuses
    let statusFilter: string[] | undefined;
    if (statuses) {
      statusFilter = statuses.split(',');
    } else if (status) {
      statusFilter = [status];
    }

    return this.tasksService.findAll(pageNum, limitNum, statusFilter);
  }

  @Get('models')
  async getModels() {
    // Group models by provider for sectioned display in UI
    const groupedModels = {
      groq: groqApiKey ? GROQ_MODELS : [],
      bytez: bytezApiKey ? BYTEZ_MODELS : [],
      google: googleApiKey ? GOOGLE_MODELS : [],
    };

    // Also return flat list for backward compatibility
    return {
      grouped: groupedModels,
      flat: models,
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Task> {
    return this.tasksService.findById(id);
  }

  @Get(':id/messages')
  async taskMessages(
    @Param('id') taskId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ): Promise<Message[]> {
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    };

    const messages = await this.messagesService.findAll(taskId, options);
    return messages;
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addTaskMessage(
    @Param('id') taskId: string,
    @Body() guideTaskDto: AddTaskMessageDto,
  ): Promise<Task> {
    return this.tasksService.addTaskMessage(taskId, guideTaskDto);
  }

  @Get(':id/messages/raw')
  async taskRawMessages(
    @Param('id') taskId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ): Promise<Message[]> {
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    };

    return this.messagesService.findRawMessages(taskId, options);
  }

  @Get(':id/messages/processed')
  async taskProcessedMessages(
    @Param('id') taskId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    };

    return this.messagesService.findProcessedMessages(taskId, options);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.tasksService.delete(id);
  }

  @Post(':id/takeover')
  @HttpCode(HttpStatus.OK)
  async takeOver(@Param('id') taskId: string): Promise<Task> {
    return this.tasksService.takeOver(taskId);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  async resume(@Param('id') taskId: string): Promise<Task> {
    return this.tasksService.resume(taskId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') taskId: string): Promise<Task> {
    return this.tasksService.cancel(taskId);
  }

  @Get(':id/shared-state')
  async getSharedState(@Param('id') taskId: string): Promise<Record<string, any>> {
    return this.tasksService.getSharedState(taskId);
  }

  @Get(':id/clarification')
  async getClarificationQuestions(@Param('id') taskId: string) {
    return this.tasksService.getClarificationSession(taskId);
  }

  @Post(':id/clarification/answer')
  @HttpCode(HttpStatus.OK)
  async submitClarificationAnswer(
    @Param('id') taskId: string,
    @Body() body: { questionId: string; answer: string },
  ) {
    return this.tasksService.submitClarificationAnswer(taskId, body.questionId, body.answer);
  }

  @Post(':id/clarification/skip')
  @HttpCode(HttpStatus.OK)
  async skipClarification(@Param('id') taskId: string) {
    return this.tasksService.skipClarification(taskId);
  }

  @Post(':id/approve-plan')
  @HttpCode(HttpStatus.OK)
  async approvePlan(
    @Param('id') taskId: string,
    @Body() body: { approvedPlan: any[] },
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.tasksService.approvePlan(taskId, body.approvedPlan);
      return { success: true, message: 'Plan approved - execution resumed' };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
