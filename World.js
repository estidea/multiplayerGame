var Matter = require('matter-js');
global.window = {};

Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body;

engine = {};
world = {};

engine = Engine.create();
world = engine.world;

world.gravity.x = 0;
world.gravity.y = 0;

Engine.run(engine);