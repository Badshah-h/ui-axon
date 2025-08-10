import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowExecution, ExecutionStatus } from '../database/entities/workflow-execution.entity';

@Injectable()
export class WorkflowExecutionService {
  constructor(
    @InjectRepository(WorkflowExecution)
    private executionRepository: Repository<WorkflowExecution>,
  ) {}

  async findAll(workflowId: string): Promise<WorkflowExecution[]> {
    return this.executionRepository.find({
      where: { workflow: { id: workflowId } },
      relations: ['workflow', 'triggeredBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<WorkflowExecution> {
    return this.executionRepository.findOne({
      where: { id },
      relations: ['workflow', 'triggeredBy'],
    });
  }

  async updateStatus(id: string, status: ExecutionStatus, output?: any, error?: string): Promise<void> {
    const updateData: any = { status };
    
    if (status === ExecutionStatus.COMPLETED) {
      updateData.completedAt = new Date();
      updateData.output = output;
    }
    
    if (status === ExecutionStatus.FAILED) {
      updateData.completedAt = new Date();
      updateData.error = error;
    }

    await this.executionRepository.update(id, updateData);
  }

  async addLog(id: string, log: Record<string, any>): Promise<void> {
    const execution = await this.executionRepository.findOne({ where: { id } });
    if (execution) {
      const logs = execution.logs || [];
      logs.push(log);
      await this.executionRepository.update(id, { logs });
    }
  }
}