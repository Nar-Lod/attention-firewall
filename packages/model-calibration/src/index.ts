import {assessAttention,type AttentionModelConfig,type BehaviorFeatures} from "@attention-firewall/attention-engine";

export interface LabeledObservation{
 features:BehaviorFeatures;
 label:"intentional"|"drifting"|"compulsive-risk";
}

export interface CalibrationReport{
 modelVersion:string;
 observations:number;
 accuracy:number;
 confusion:Record<string,Record<string,number>>;
}

export function classifyLabel(label:LabeledObservation["label"]):number{
 return label==="intentional"?1:label==="drifting"?2:3;
}

export function evaluateModel(observations:LabeledObservation[],model?:AttentionModelConfig):CalibrationReport{
 const confusion:Record<string,Record<string,number>>={intentional:{intentional:0,drifting:0,"compulsive-risk":0},drifting:{intentional:0,drifting:0,"compulsive-risk":0},"compulsive-risk":{intentional:0,drifting:0,"compulsive-risk":0}};
 let correct=0;
 for(const observation of observations){
  const predicted=assessAttention(observation.features,model).state;
  const actual=observation.label;
  confusion[actual][predicted]= (confusion[actual][predicted]??0)+1;
  if(predicted===actual)correct++;
 }
 return {
  modelVersion:model?.version??"attention-v1",
  observations:observations.length,
  accuracy:observations.length?correct/observations.length:0,
  confusion
 };
}
