import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all workflows' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  async findAll(@Request() req) {
    return this.workflowsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.workflowsService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async create(@Body() workflowData: any, @Request() req) {
    return this.workflowsService.create(workflowData, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  async update(@Param('id') id: string, @Body() workflowData: any, @Request() req) {
    return this.workflowsService.update(id, workflowData, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  async delete(@Param('id') id: string, @Request() req) {
    return this.workflowsService.delete(id, req.user.id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute workflow' })
  @ApiResponse({ status: 200, description: 'Workflow execution started' })
  async execute(@Param('id') id: string, @Body() input: any, @Request() req) {
    return this.workflowsService.execute(id, input, req.user.id);
  }
}