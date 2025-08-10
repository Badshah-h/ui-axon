import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Workflow } from './entities/workflow.entity';
import { WorkflowNode } from './entities/workflow-node.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { AIProvider } from './entities/ai-provider.entity';
import { Organization } from './entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Workflow,
      WorkflowNode,
      WorkflowExecution,
      AIProvider,
      Organization,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}