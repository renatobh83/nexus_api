import { Whatsapp } from "../../generated/prisma/client";
import { WppWebRepository } from "./wppWebRepository";

export class WppWebService {
  private whatsappRepository: WppWebRepository;
  constructor() {
    this.whatsappRepository = new WppWebRepository();   
  }
 
}