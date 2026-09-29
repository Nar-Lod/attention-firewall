export interface RuntimeFixture{
 name:string;
 sample:{elapsedSeconds:number;interactions:number;scrolls:number;domain?:string;scrollBursts?:number;scrollDirectionChanges?:number;scrollDistancePerMinute?:number;lateNightRisk?:number};
 expected: {intervention:string};
}
export const fixtures:RuntimeFixture[]=[
 {name:"intentional browsing remains unblocked",sample:{elapsedSeconds:60,interactions:20,scrolls:6,domain:"example.com"},expected:{intervention:"none"}},
 {name:"passive scrolling triggers friction",sample:{elapsedSeconds:600,interactions:0,scrolls:300,domain:"example.com",scrollBursts:12,lateNightRisk:1},expected:{intervention:"deliberation"}},
 {name:"intent budget approaching triggers awareness",sample:{elapsedSeconds:100,interactions:20,scrolls:6,domain:"example.com"},expected:{intervention:"awareness"}},
 {name:"intent budget exceeded triggers pause",sample:{elapsedSeconds:70,interactions:2,scrolls:4,domain:"example.com"},expected:{intervention:"pause"}},
 {name:"site commitment can enforce delay",sample:{elapsedSeconds:30,interactions:20,scrolls:5,domain:"example.com"},expected:{intervention:"delay"}}
];
