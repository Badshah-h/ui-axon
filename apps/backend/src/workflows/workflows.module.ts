import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import { Workflow } from '../database/entities/workflow.entity';
import { WorkflowNode } from '../database/entities/workflow-node.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowNode, WorkflowExecution]),
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowExecutionService],
  exports: [WorkflowsService, WorkflowExecutionService],
})
export class WorkflowsModule {}