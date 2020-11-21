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
import Footer from "./components/footer";

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
  /*  modelPath, */
  positionX,
  positionY,
  positionZ,
}) => {
  // wrapper for the html contents

  const ref = useRef();
  /* useFrame(() => (ref.current.rotation.y += 0.005)); */
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
        {/* <mesh ref={ref} position={[0, 0, 0]}>
          <Model modelPath={modelPath} />
        </mesh> */}
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

function FakeSphere({ color = "red", ...props }) {
  return (
    <mesh {...props}>
      <sphereBufferGeometry args={[5, 32, 32]} attach="geometry" />
      <meshBasicMaterial color={color} attach="material" />
    </mesh>
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

function Stripe({ scaleX, scaleY, posX, posY, posZ, dir, color }) {
  var dirZ = (Math.PI / 4) * dir;
  const { contentMaxWidth } = useBlock();
  return (
    <Plane
      scale={[scaleX, contentMaxWidth * scaleY, 1]}
      rotation={[0, 0, dirZ]}
      position={[posX, posY, posZ]}
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
            bgColor={"#F1D1B5"}
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
            /* modelPath="/monitor.gltf" */
            positionX={3}
            positionY={-800}
            positionZ={50}
            bgColor={"#568EA6"}
          >
            <div
              class="container"
              onMouseMove={({ clientX: x, clientY: y }) =>
                setp({ xy: calc(x, y) })
              }
            >
              <animated.div style={{ transform: props.xy.interpolate(trans) }}>
                <Trail open={open} onClick={() => set((state) => !state)}>
                  <p>Testing Box1</p>
                </Trail>
              </animated.div>
            </div>
          </HTMLContent>

          <HTMLContent
            domContent={domContent}
            /* modelPath="/monitor.gltf" */
            positionX={3}
            positionY={-1300}
            positionZ={50}
            bgColor={"#305F72"}
          >
            <div
              class="container"
              onMouseMove={({ clientX: x, clientY: y }) =>
                setp({ xy: calc(x, y) })
              }
            >
              <animated.div style={{ transform: props.xy.interpolate(trans) }}>
                <Trail open={open} onClick={() => set((state) => !state)}>
                  <p>Testing Box</p>
                </Trail>
              </animated.div>
            </div>
          </HTMLContent>

          {/* First section */}

          <Block factor={1.75} offset={0}>
            <Content
              left
              color={"#8FCB9B"}
              posX={-180}
              posY={-65}
              posZ={20}
              scaleX={30}
              scaleY={150}
            />
          </Block>
          <Block factor={-2.0} offset={0}>
            <Content
              left
              color={"#5B9279"}
              posX={-167}
              posY={-90}
              posZ={10}
              scaleX={30}
              scaleY={150}
            />
          </Block>
          <Block factor={1.4} offset={0}>
            <Content
              left
              color={"#414536"}
              posX={-150}
              posY={-105}
              posZ={-70}
              scaleX={30}
              scaleY={150}
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
          <Block factor={-3.8} offset={1}>
            <Stripe
              scaleX={300}
              scaleY={3}
              posX={0}
              posY={-2650}
              posZ={-400}
              dir={1}
              color={"#ff847c"}
            />
          </Block>
          {/* Stripe - Salmon Main*/}
          <Block factor={-2.5} offset={1}>
            <Stripe
              scaleX={400}
              scaleY={3}
              posX={0}
              posY={-1800}
              posZ={-500}
              dir={1}
              color={"#fecea8"}
            />
          </Block>
          {/* The Sun */}
          <Block factor={1.0} offset={1}>
            <FakeSphere
              scale={[15, 15, 1]}
              position={[200, 200, -300]}
              color={"#F95D20"}
            />
          </Block>
          {/* The Ocean */}
          <Block factor={0.8} offset={1}>
            <Stripe
              scaleX={500}
              scaleY={3}
              posX={-50}
              posY={-300}
              posZ={-250}
              dir={2}
              color={"#AED9E0"}
            />
          </Block>
          {/* Last section */}
          <Block factor={1.3} offset={1}>
            <Stripe
              scaleX={400}
              scaleY={1}
              posX={100}
              posY={-160}
              posZ={-100}
              dir={1}
              color={"#705b46"}
            />
          </Block>
          <Block factor={1.4} offset={1}>
            <Stripe
              scaleX={500}
              scaleY={1}
              posX={-50}
              posY={-180}
              posZ={-150}
              dir={1}
              color={"#5a4233"}
            />
          </Block>
          <Block factor={1.4} offset={1}>
            <Stripe
              scaleX={500}
              scaleY={1}
              posX={-800}
              posY={-180}
              posZ={-150}
              dir={1}
              color={"#5a4233"}
            />
          </Block>
          <Block factor={1.5} offset={1}>
            <Stripe
              scaleX={600}
              scaleY={1}
              posX={-300}
              posY={-120}
              posZ={-50}
              dir={1}
              color={"#43291f"}
            />
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
