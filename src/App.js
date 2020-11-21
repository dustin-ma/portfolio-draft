import React, { Suspense, useRef, useEffect, useState, Component } from "react";
import "./App.scss";
import lerp from "lerp";
//Components
import Header from "./components/header";
import TextLoop from "react-text-loop";
import { Section } from "./components/section";
import { InView } from "react-intersection-observer";
import { Canvas, useFrame, useThree } from "react-three-fiber";
import { useTrail, useSpring, animated, a } from "react-spring";
import { useTransition, Spring } from "@react-spring/web";
import { motion } from "framer-motion";
import { Block, useBlock } from "./components/blocks";
import Typical from "react-typical";
import { Html, useProgress, useGLTFLoader } from "drei";

// page states
import state from "./components/state";

// intersection observer
import { useInView } from "react-intersection-observer";

// const { mouse } = useThree();

var cursor = true;
var speed = 300;

setInterval(() => {
  if (cursor && document.getElementById("cursor") != null) {
    document.getElementById("cursor").style.opacity = 0;
    cursor = false;
  } else if (!cursor && document.getElementById("cursor") != null) {
    document.getElementById("cursor").style.opacity = 1;
    cursor = true;
  }
}, speed);

const Model = ({ modelPath }) => {
  const gltf = useGLTFLoader(modelPath, true);
  gltf.scene.scale.set(0.25, 0.25, 0.25);
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
  const items = React.Children.toArray(children);
  const trail = useTrail(items.length, {
    config: { mass: 8, tension: 2000, friction: 200 },
    delay: 500,
    opacity: open ? 1 : 0,
    x: open ? 0 : 20,
    height: open ? 10 : 0,
    from: { opacity: 1, x: 20, height: 0 },
  });
  return (
    <div className="trails-main" {...props}>
      <div>
        {trail.map(({ x, height, ...rest }, index) => (
          <a.div
            key={items[index]}
            className="trails-text"
            style={{
              ...rest,
              transform: x.interpolate((x) => `translate3d(0,${x}px,0)`),
            }}
          >
            <a.div style={{ height }}>{items[index]}</a.div>
          </a.div>
        ))}
      </div>
    </div>
  );
}

function Plane({ color = "white", ...props }) {
  return (
    <mesh {...props}>
      <planeBufferGeometry attach="geometry" />
      <meshBasicMaterial attach="material" color={color} />
    </mesh>
  );
}

function Cross({ scaleXYZ, posX, posY }) {
  const ref = useRef();
  const { viewportHeight } = useBlock();
  useFrame(() => {
    const curTop = state.top.current;
    const curY = ref.current.rotation.z;
    const nextY =
      (curTop / ((state.pages - 1) * viewportHeight * 20)) * Math.PI;
    ref.current.rotation.z = lerp(curY, nextY, 1.8);
  });
  return (
    <group
      ref={ref}
      position={[posX, posY, 0]}
      scale={[scaleXYZ, scaleXYZ, scaleXYZ]}
    >
      <Plane scale={[1, 0.2, 0.2]} color="#e6e0d6" />
      <Plane scale={[0.2, 1, 0.2]} color="#e6e0d6" />
    </group>
  );
}

function Stripe({ scaleX, posY, dir, color }) {
  var dirZ = (Math.PI / 4) * dir;
  const { contentMaxWidth } = useBlock();
  return (
    <Plane
      scale={[scaleX, contentMaxWidth, 1]}
      rotation={[0, 0, dirZ]}
      position={[0, posY, -1]}
      color={color}
    />
  );
}

function Content({ left, children, scaleX, scaleY, posY, posX, posZ, color }) {
  const { contentMaxWidth, canvasWidth, margin } = useBlock();
  const aspect = 1.75;
  /* const alignRight = (canvasWidth - contentMaxWidth - margin) / 2 */
  /* [alignRight * (left ? -1 : 1) */
  return (
    <group position={[posX, posY, posZ]}>
      <Plane scale={[scaleX, scaleY, 1]} color={color} />
      {children}
    </group>
  );
}

function Loader() {
  const { active, progress } = useProgress();
  const transition = useTransition(active, {
    from: { opacity: 1, progress: 0 },
    leave: { opacity: 0 },
    update: { progress },
  });
  return transition(
    ({ progress, opacity }, active) =>
      active && (
        <a.div className="loading" style={{ opacity }}>
          <div className="loading-bar-container">
            <a.div className="loading-bar" style={{ width: progress }}></a.div>
          </div>
        </a.div>
      )
  );
}

const calc = (x, y) => [x - window.innerWidth / 2, y - window.innerHeight / 2];
const trans = (x, y) => `translate3d(${x / 20}px,${y / 20}px,0)`;

export default function App() {
  const [open, set] = useState(true);
  const [props, setp] = useSpring(() => ({
    xy: [0, 0],
    config: { mass: 10, tension: 550, friction: 140 },
  }));
  const domContent = useRef();
  const scrollArea = useRef();
  const onScroll = (e) => (state.top.current = e.target.scrollTop);
  const fade = useSpring({ from: { opacity: 0 }, delay: 1000, opacity: 1 });

  useEffect(() => void onScroll({ target: scrollArea.current }), []);

  return (
    <>
      <Header />
      <Canvas
        colorManagement
        orthographic
        camera={{ zoom: state.zoom / 5, position: [0, 0, 500] }}
      >
        <Lights />
        <Suspense fallback={null}>
          <HTMLContent
            domContent={domContent}
            modelPath="/monitor.gltf"
            positionX={-100}
            positionY={250}
            positionZ={-50}
            bgColor={"#f0c871"}
          >
            <div
              class="container"
              onMouseMove={({ clientX: x, clientY: y }) =>
                setp({ xy: calc(x, y) })
              }
            >
              <animated.div style={{ transform: props.xy.interpolate(trans) }}>
                <Trail open={open} onClick={() => set((state) => !state)}>
                  <span>
                    <p>
                      HI, I'M <weighted>DUSTIN MA</weighted> 👋
                    </p>
                  </span>
                  <TextLoop>
                    <span>
                      <p>
                        ASPIRING FRONT END DEVELOPER<span id="cursor"> |</span>
                      </p>
                    </span>
                    <span>
                      <p>
                        COMPUTER SCIENCE STUDENT<span id="cursor"> |</span>
                      </p>
                    </span>
                    <span>
                      <p>
                        DESIGN ENTHUSIAST<span id="cursor"> |</span>
                      </p>
                    </span>
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
            positionX={3}
            positionY={-200}
            positionZ={50}
            bgColor={"#8FCB9B"}
          >
            {/* <motion.div initial={{ scale: 0 }}
              animate={{ rotate: 180, scale: 3 }}
              transition={{
              repeat: Infinity,
              type: "spring",
              stiffness: 260,
              damping: 20
            }}> */}
            <h1 className="title">Great Success!</h1>
          </HTMLContent>

          {/* First section */}

          <Block factor={1.75} offset={0}>
            <Content
              left
              color={"#8FCB9B"}
              posX={-100}
              posY={-20}
              posZ={0}
              scaleX={150}
              scaleY={10}
            />
          </Block>
          <Block factor={-2.0} offset={0}>
            <Content
              left
              color={"#5B9279"}
              posX={-100}
              posY={-30}
              posZ={-60}
              scaleX={150}
              scaleY={15}
            />
          </Block>
          <Block factor={1.0} offset={0}>
            <Content
              left
              color={"#414536"}
              posX={-100}
              posY={-45}
              posZ={-70}
              scaleX={150}
              scaleY={20}
            />
          </Block>

          {/* Second section */}
          <Block factor={2} offset={2}>
            <Content
              color={"#ead2ac"}
              posX={0}
              posY={0}
              scaleX={30}
              scaleY={30}
            />
          </Block>
          {/* Stripe - Transition */}
          <Block factor={-1.0} offset={1}>
            <Stripe scaleX={750} posY={0} dir={1} color={"#e6b89c"} />
          </Block>
          {/* Stripe - Salmon Main*/}
          <Block factor={-1.5} offset={1}>
            <Stripe scaleX={750} posY={0} dir={1} color={"#ffb584"} />
          </Block>
          {/*           <Block factor={0.3} offset={0}>
            <Cross scaleXYZ={5} posX={50} posY={-50}/>
            <Cross scaleXYZ={5} posX={40} posY={-50}/>
            <Cross scaleXYZ={5} posX={30} posY={-50}/>
            <Cross scaleXYZ={5} posX={50} posY={-40}/>
            <Cross scaleXYZ={5} posX={40} posY={-40}/>
            <Cross scaleXYZ={5} posX={30} posY={-40}/>
            <Cross scaleXYZ={5} posX={80} posY={-50}/>
            <Cross scaleXYZ={5} posX={70} posY={-50}/>
            <Cross scaleXYZ={5} posX={60} posY={-50}/>
            <Cross scaleXYZ={5} posX={80} posY={-40}/>
            <Cross scaleXYZ={5} posX={70} posY={-40}/>
            <Cross scaleXYZ={5} posX={60} posY={-40}/>
          </Block> */}
          {/* Last section */}
          <Block factor={1.0} offset={1}>
            <Content left>
              <Block factor={-1.0} color={"#bfe2ca"} scaleX={100} scaleY={100}>
                <Cross />
              </Block>
            </Content>
          </Block>
          <Block factor={1.2} offset={1}>
            <Stripe scaleX={750} posY={-1200} dir={-1} color={"#718C98"} />
          </Block>
          <Block factor={1.1} offset={1}>
            <Stripe scaleX={750} posY={-1200} dir={-1} color={"#4281A4"} />
          </Block>
        </Suspense>
      </Canvas>
      <Loader />
      <div className="scrollArea" ref={scrollArea} onScroll={onScroll}>
        <div style={{ position: "sticky", top: 0 }} ref={domContent}></div>
        <div style={{ height: `${state.sections * 100}vh` }}></div>
      </div>
    </>
  );
}
