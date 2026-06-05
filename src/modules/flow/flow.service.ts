import { Prisma } from "@prisma/client";
import { FlowsRepository } from "./flow.repository.js";

export class FlowsService {
  private flowsRepository: FlowsRepository;
  constructor() {
    this.flowsRepository = new FlowsRepository();
  }
  async listAll() {
    return await this.flowsRepository.listAll();
  }
  async findById(id: string) {
    return await this.flowsRepository.find(id);
  }
  async findFirst() {
    return await this.flowsRepository.findFirst();
  }
  async createOrUpdate(data: Prisma.flowsCreateInput) {
    return await this.flowsRepository.createOrUpdate(data);
  }

  async deleteFlows(id: string) {
    return await this.flowsRepository.delete(id);
  }
  async flowExecutionFindFirst(where : Prisma.FlowExecutionWhereInput) {
    
    return await this.flowsRepository.flowExecutionFindFirst(where);
  }
  async createflowExecution(data: Prisma.FlowExecutionCreateInput){
    return await this.flowsRepository.createflowExecution(data)

  }
  async updoateFlowExecution(id: string, data: Prisma.FlowExecutionUpdateInput){
    return await this.flowsRepository.updateFlowExecution(id, data)
    
  }
}
