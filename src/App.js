import React, { Suspense, useRef, useEffect, useState, Component } from "react";
import "./App.scss";
import lerp from "lerp"
//Components
import Header from "./components/header";
import TextLoop from "react-text-loop";
import { Section } from "./components/section";
import { Canvas, useFrame, useThree } from "react-three-fiber";
import { useTrail, useSpring, animated, a } from 'react-spring';
import { Block, useBlock } from "./components/blocks";
import Typical from 'react-typical'
import { Html, useGLTFLoader } from "drei";

// page states
import state from "./components/state";

// intersection observer
import { useInView } from "react-intersection-observer";

// const { mouse } = useThree();

var cursor = true;
var speed = 250;

setInterval(() => {
   if(cursor && document.getElementById('cursor') != null) {
     document.getElementById('cursor').style.opacity = 0;
     cursor = false;
   }else if(!cursor && document.getElementById('cursor') != null){
     document.getElementById('cursor').style.opacity = 1;
     cursor = true;
   }
}, speed);




const Model = ({ modelPath }) => {
  const gltf = useGLTFLoader(modelPath, true);
  gltf.scene.scale.set(0.04,0.04,0.04);
  return <primitive object={gltf.scene} dispose={null} />;
};

const Lights = () => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[0, 10, 0]} intensity={1.5} />
      <spotLight intensity={1} position={[1000, 0, 0]} />
    </>
  );
};

const HTMLContent = ({
  bgColor,
  domContent,
  children,
  modelPath,
  positionX,
  positionY,
  positionZ,
}) => {
  // wrapper for the html contents

  const ref = useRef();
  useFrame(() => (ref.current.rotation.y += 0.005));
  // useFrame(() => (console.log(mouse)));
  const [refItem, inView] = useInView({
    threshold: 0,
  });

  useEffect(() => {
    inView && (document.body.style.background = bgColor);
  }, [inView, bgColor]);

  return (
    <Section factor={1.5} offset={1}>
      <group position={[positionX, positionY, positionZ]}>
        <mesh ref={ref} position={[0, 0, 0]}>
          <Model modelPath={modelPath} />
        </mesh>
        <Html portal={domContent} fullscreen>
          <div className="container" ref={refItem}>
            {children}
          </div>
          
        </Html>
      </group>
    </Section>
  );
};

function Trail({ open, children, ...props }) {
  const items = React.Children.toArray(children)
  const trail = useTrail(items.length, {
    config: { mass: 8, tension: 2000, friction: 200 },
    opacity: open ? 1 : 0,
    x: open ? 0 : 20,
    height: open ? 110 : 0,
    from: { opacity: 50, x: 20, height: 0 },
  })
  return (
    <div className="trails-main" {...props}>
      <div>
        {trail.map(({ x, height, ...rest }, index) => (
          <a.div
            key={items[index]}
            className="trails-text"
            style={{ ...rest, transform: x.interpolate((x) => `translate3d(0,${x}px,0)`) }}>
            <a.div style={{ height }}>{items[index]}</a.div>
          </a.div>
        ))}
      </div>
    </div>
  )
}

function Plane({ color = "white", ...props }) {
  return (
    <mesh {...props}>
      <planeBufferGeometry attach="geometry" />
      <meshBasicMaterial attach="material" color={color} />
    </mesh>
  )
}

function Cross() {
  const ref = useRef()
  const { viewportHeight } = useBlock()
  useFrame(() => {
    const curTop = state.top.current
    const curY = ref.current.rotation.z
    const nextY = (curTop / ((state.pages - 1) * viewportHeight * 75)) * Math.PI
    ref.current.rotation.z = lerp(curY, nextY, 1.5)
  })
  return (
    <group ref={ref} scale={[20, 20, 20]}>
      <Plane scale={[1, 0.2, 0.2]} color="#e6e0d6" />
      <Plane scale={[0.2, 1, 0.2]} color="#e6e0d6" />
    </group>
  )
}

function Stripe({scaleX, posY, dir, color}) {
  var dirZ = (Math.PI / 4) * dir;
  const { contentMaxWidth } = useBlock()
  return (
    <Plane scale={[scaleX, contentMaxWidth, 1]} rotation={[0, 0, dirZ]} position={[0, posY, -1]} color={color} />
  )
}

function Content({ left, children, scaleX, scaleY, posY, color }) {
  const { contentMaxWidth, canvasWidth, margin } = useBlock()
  const aspect = 1.75
  const alignRight = (canvasWidth - contentMaxWidth - margin) / 2
  return (
    <group position={[alignRight * (left ? -1 : 1), posY, 0]}>
      <Plane scale={[scaleX, scaleY, 1]} color={color} />
      {children}
    </group>
  )
}

const calc = (x, y) => [x - window.innerWidth / 2, y - window.innerHeight / 2];
const trans = (x, y) => `translate3d(${x / 20}px,${y / 20}px,0)`

export default function App() {
  const [open, set] = useState(true);
  const [props, setp] = useSpring(() => ({ xy: [0, 0], config: { mass: 10, tension: 550, friction: 140 } }));
  const domContent = useRef();
  const scrollArea = useRef();
  const onScroll = (e) => (state.top.current = e.target.scrollTop);
  
  useEffect(() => void onScroll({ target: scrollArea.current }), []);
  return (
    <>
      <Header />
      <Canvas colorManagement camera={{ position: [0, 0, 120], fov: 70 }}>
        <Lights />
        <Suspense fallback={null}>

          <HTMLContent
            domContent={domContent}
            modelPath="/monitor.gltf"
            positionX={-26}
            positionY={44}
            positionZ={60}
            bgColor={"#f0c871"}
          >
          <div class="container" onMouseMove={({ clientX: x, clientY: y }) => setp({ xy: calc(x, y) })}>
          <animated.div style={{transform: props.xy.interpolate(trans)}}>
              <Trail open={open} onClick={() => set((state) => !state)}>
                  <span className="title">HI, I'M DUSTIN MA 👋</span>
                  <TextLoop>
                    <span>ASPIRING FRONT END DEVELOPER</span>
                    <span>COMPUTER SCIENCE STUDENT</span>
                    <span>DESIGN ENTHUSIAST</span>
                 </TextLoop>{" "}
              </Trail>
              </animated.div>  
          </div>
              {/* <h1 className="title">
              <Typical
                steps={['Hello, my name is Dustin Ma 👋', 1000]}
                loop={Infinity} 
              />
               <p>
                I'm 
              <Typical
                steps={[' a Computer Science Student.', 1000,' an aspiring front end developer.', 1000,' a design enthusiast.', 1000]}
                loop={Infinity}
                wrapper="b"
              />
               </p>
              </h1> */}
              
          
          </HTMLContent>
          
          <HTMLContent
            domContent={domContent}
            modelPath="/armchairGray.gltf"
            positionX={5}
            positionY={-42}
            positionZ={108}
            bgColor={"#86bbc3"}
          >
            <h1 className="title">Great Success!</h1>
          </HTMLContent>

          {/* First section */}
    
          <Block factor={1.5} offset={0}>
            <Content left color={"#718C98"} posY={5} scaleX={30} scaleY={30}/>
          </Block>
          
          {/* Second section */}
          <Block factor={2} offset={2}>
            <Content color={"#ead2ac"} posY={0} scaleX={30} scaleY={30}/>
          </Block>
          {/* Stripe - Transition */}
          <Block factor={-1.0} offset={1}>
            <Stripe scaleX={750} posY={0} dir={1} color={"#e6b89c"}/>
          </Block>
          {/* Stripe - Salmon Main*/}
          <Block factor={-1.5} offset={1}>
            <Stripe scaleX={750} posY={0} dir={1} color={"#fe938c"}/>
          </Block>
          {/* Last section */}
          <Block factor={1.0} offset={2}>
            <Content left>
              <Block factor={-1.0} color={"#bfe2ca"} scaleX={100} scaleY={100}>
                <Cross />
              </Block>
            </Content>
          </Block>
          <Block factor={1.2} offset={1}>
            <Stripe scaleX={750} posY={-1200} dir={-1} color={"#718C98"}/>
          </Block>
          <Block factor={1.1} offset={1}>
            <Stripe scaleX={750} posY={-1200} dir={-1} color={"#4281A4"}/>
          </Block>
        </Suspense>
      </Canvas>
      <div className="scrollArea" ref={scrollArea} onScroll={onScroll}>
        <div style={{ position: "sticky", top: 0 }} ref={domContent}></div>
        <div style={{ height: `${state.sections * 150}vh` }}></div>
      </div>
    </>
  );
}
