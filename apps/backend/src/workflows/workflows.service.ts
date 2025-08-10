import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from '../database/entities/workflow.entity';
import { WorkflowNode } from '../database/entities/workflow-node.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowNode)
    private nodeRepository: Repository<WorkflowNode>,
    @InjectRepository(WorkflowExecution)
    private executionRepository: Repository<WorkflowExecution>,
  ) {}

  async findAll(userId: string): Promise<Workflow[]> {
    return this.workflowRepository.find({
      where: { createdBy: { id: userId } },
      relations: ['nodes', 'createdBy', 'organization'],
    });
  }

  async findOne(id: string, userId: string): Promise<Workflow> {
    return this.workflowRepository.findOne({
      where: { id, createdBy: { id: userId } },
      relations: ['nodes', 'createdBy', 'organization'],
    });
  }

  async create(workflowData: Partial<Workflow>, userId: string): Promise<Workflow> {
    const workflow = this.workflowRepository.create({
      ...workflowData,
      createdBy: { id: userId } as any,
    });
    return this.workflowRepository.save(workflow);
  }

  async update(id: string, workflowData: Partial<Workflow>, userId: string): Promise<Workflow> {
    await this.workflowRepository.update(
      { id, createdBy: { id: userId } },
      workflowData
    );
    return this.findOne(id, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.workflowRepository.delete({ id, createdBy: { id: userId } });
  }

  async execute(id: string, input: any, userId: string): Promise<WorkflowExecution> {
    const workflow = await this.findOne(id, userId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const execution = this.executionRepository.create({
      workflow,
      input,
      triggeredBy: { id: userId } as any,
      startedAt: new Date(),
    });

    return this.executionRepository.save(execution);
  }
}