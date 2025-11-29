// 全局变量
let scene, camera, renderer, ground, boxes, player, mikuPlane, earth, boulder;

// 物理参数配置
const PHYSICS = {
    gravity: -0.02,
    playerRadius: 0.5,
    boxSize: 1.0,
    pushForce: 0.25,
    friction: 0.9,
    angularFriction: 0.95,
    elasticity: 0.5,
    collisionEpsilon: 0.01,
    maxCollisionIterations: 5,
    playerHeight: 1.8,
    torqueMultiplier: 0.05,
    boxMass: 1.0,
    boxInertia: 1,
    boulderMass: 5.0,
    boulderRadius: 1.5,
    boulderFriction: 0.7,
    hillHeight: 10,
    hillRadius: 20
};

// 初始化函数
async function init() {
    try {
        // 1. 初始化场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xF0F8FF);
        
        // 2. 初始化相机
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.6, 3);
        camera.lookAt(0, 1.6, 0);
        
        // 3. 初始化渲染器
        initRenderer();
        
        // 4. 添加光源
        initLights();
        
        // 5. 并行加载资源
        await Promise.all([
            initGround('grass.jpg'),
            initMikuPlane(),
            initBoxes(),
            initEarth(),
            initBoulder()
        ]);
        
        // 6. 初始化玩家
        initPlayer();
        
        // 7. 设置控制
        setupControls();
        
        // 8. 开始动画循环
        animate();
        
        document.getElementById('debug').textContent = "场景加载完成！移动: WASD 或屏幕按钮";
    } catch (err) {
        handleError(err);
    }
}

function initRenderer() {
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        
        const style = renderer.domElement.style;
        style.position = 'fixed';
        style.top = '0';
        style.left = '0';
        style.zIndex = '1';
        
        document.body.appendChild(renderer.domElement);
    } catch (e) {
        throw new Error(`渲染器初始化失败: ${e.message}`);
    }
}

function initLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
}

async function initGround(texturePath) {
    try {
        // 使用默认草地纹理
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // 创建草地纹理
        context.fillStyle = '#5b8';
        context.fillRect(0, 0, 256, 256);
        
        context.fillStyle = '#6c9';
        for (let i = 0; i < 500; i++) {
            context.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);
        
        ground = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ 
                map: texture,
                side: THREE.DoubleSide,
                roughness: 0.8
            })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        scene.add(ground);
    } catch (err) {
        throw new Error(`地面加载失败: ${err.message}`);
    }
}

async function initMikuPlane() {
    try {
        // 创建Miku平面（使用默认纹理）
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // 创建粉色背景
        context.fillStyle = '#FF69B4';
        context.fillRect(0, 0, 512, 512);
        
        // 添加简单的Miku图案
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 80px Arial';
        context.textAlign = 'center';
        context.fillText('Miku', 256, 256);
        
        const texture = new THREE.CanvasTexture(canvas);
        
        const imgRatio = 512 / 512;
        const width = 2;
        const height = width * imgRatio;
        
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            roughness: 0.2
        });
        
        mikuPlane = new THREE.Mesh(geometry, material);
        mikuPlane.position.set(-3, height/2, -3);
        mikuPlane.rotation.y = Math.PI/4;
        mikuPlane.castShadow = true;
        mikuPlane.receiveShadow = true;
        
        // 添加边框
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })
        );
        mikuPlane.add(line);
        
        scene.add(mikuPlane);
    } catch (err) {
        console.warn(`Miku加载失败: ${err.message}`);
        
        const geometry = new THREE.PlaneGeometry(2, 3);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFF69B4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        
        mikuPlane = new THREE.Mesh(geometry, material);
        scene.add(mikuPlane);
    }
}

async function initBoxes() {
    try {
        boxes = [];
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.7 }),
            new THREE.MeshStandardMaterial({ color: 0x44ff44, roughness: 0.7 }),
            new THREE.MeshStandardMaterial({ color: 0x4444ff, roughness: 0.7 }),
            new THREE.MeshStandardMaterial({ color: 0xffff44, roughness: 0.7 }),
            new THREE.MeshStandardMaterial({ color: 0xff44ff, roughness: 0.7 })
        ];
        
        for (let i = 0; i < 5; i++) {
            const box = new THREE.Mesh(geometry, materials[i]);
            box.position.set(i * 3 - 1.5, 0.5, 0);
            box.castShadow = true;
            box.receiveShadow = true;
            box.userData = { 
                velocity: new THREE.Vector3(),
                angularVelocity: 0,
                mass: PHYSICS.boxMass,
                isBox: true,
                size: new THREE.Vector3(1, 1, 1)
            };
            scene.add(box);
            boxes.push(box);
        }
        
        // 添加坐标轴辅助
        scene.add(new THREE.AxesHelper(5));
    } catch (err) {
        throw new Error(`方块初始化失败: ${err.message}`);
    }
}

async function initEarth() {
    return new Promise((resolve) => {
        // 创建地球纹理
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // 绘制地球纹理
        const gradient = context.createRadialGradient(256, 128, 0, 256, 128, 200);
        gradient.addColorStop(0, '#2266cc');
        gradient.addColorStop(0.7, '#2266cc');
        gradient.addColorStop(1, '#114499');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 512, 256);
        
        // 添加大陆
        context.fillStyle = '#3a7';
        context.beginPath();
        context.ellipse(150, 100, 40, 30, 0, 0, Math.PI * 2);
        context.fill();
        
        context.beginPath();
        context.ellipse(350, 150, 50, 40, 0, 0, Math.PI * 2);
        context.fill();
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshPhongMaterial({ map: texture });
        
        earth = new THREE.Mesh(
            new THREE.SphereGeometry(5, 32, 32),
            material
        );
        earth.position.set(15, 5, -5);
        scene.add(earth);
        resolve();
    });
}

async function initBoulder() {
    return new Promise((resolve) => {
        // 创建巨石纹理
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // 绘制岩石纹理
        context.fillStyle = '#666';
        context.fillRect(0, 0, 256, 256);
        
        context.fillStyle = '#888';
        for (let i = 0; i < 200; i++) {
            context.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshPhongMaterial({ map: texture });
        
        boulder = new THREE.Mesh(
            new THREE.SphereGeometry(PHYSICS.boulderRadius, 32, 32),
            material
        );
        boulder.position.set(0, PHYSICS.boulderRadius, -PHYSICS.hillRadius);
        boulder.userData = {
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            mass: PHYSICS.boulderMass,
            isBoulder: true,
            size: new THREE.Vector3(PHYSICS.boulderRadius * 2, PHYSICS.boulderRadius * 2, PHYSICS.boulderRadius * 2)
        };
        scene.add(boulder);
        resolve();
    });
}

function initPlayer() {
    player = {
        position: new THREE.Vector3(0, 1.6, 0),
        rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
        moveSpeed: 0.15,
        controls: { 
            forward: false, 
            backward: false, 
            left: false, 
            right: false 
        },
        size: new THREE.Vector3(PHYSICS.playerRadius * 2, PHYSICS.playerHeight, PHYSICS.playerRadius * 2)
    };
}
function setupControls() {
    const setControl = (key, state) => {
        const btn = document.getElementById(`btn-${key.toLowerCase()}`);
        if (btn) btn.classList.toggle('active', state);
        player.controls[key] = state;
    };

    const buttons = { 'w': 'forward', 'a': 'left', 's': 'backward', 'd': 'right' };
    
    Object.entries(buttons).forEach(([key, control]) => {
        const btn = document.getElementById(`btn-${key}`);
        if (!btn) return;
        
        const activate = () => setControl(control, true);
        const deactivate = () => setControl(control, false);
        
        btn.addEventListener('touchstart', activate, { passive: true });
        btn.addEventListener('touchend', deactivate);
        btn.addEventListener('touchcancel', deactivate);
        btn.addEventListener('mousedown', activate);
    });
    
    window.addEventListener('mouseup', () => {
        Object.values(buttons).forEach(control => setControl(control, false));
    });
    
    // 键盘控制
    const onKeyDown = (event) => {
        switch(event.key.toLowerCase()) {
            case 'w': setControl('forward', true); break;
            case 'a': setControl('left', true); break;
            case 's': setControl('backward', true); break;
            case 'd': setControl('right', true); break;
        }
    };
    
    const onKeyUp = (event) => {
        switch(event.key.toLowerCase()) {
            case 'w': setControl('forward', false); break;
            case 'a': setControl('left', false); break;
            case 's': setControl('backward', false); break;
            case 'd': setControl('right', false); break;
        }
    };
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    // 视角控制
    let isRotating = false;
    let lastTouch = { x: 0, y: 0 };
    
    const startRotate = (x, y) => {
        isRotating = true;
        lastTouch = { x, y };
    };
    
    const endRotate = () => isRotating = false;
    
    const handleRotate = (x, y) => {
        if (!isRotating) return;
        
        const deltaX = x - lastTouch.x;
        const deltaY = y - lastTouch.y;
        
        player.rotation.y -= deltaX * 0.002;
        player.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, 
            player.rotation.x - deltaY * 0.002));
        
        lastTouch = { x, y };
    };
    
    // 触摸控制
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) startRotate(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) handleRotate(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    
    renderer.domElement.addEventListener('touchend', endRotate);
    
    // 鼠标控制
    renderer.domElement.addEventListener('mousedown', (e) => {
        startRotate(e.clientX, e.clientY);
    });
    
    renderer.domElement.addEventListener('mousemove', (e) => {
        handleRotate(e.clientX, e.clientY);
    });
    
    window.addEventListener('mouseup', endRotate);
}

function updatePlayerPosition() {
    const moveDirection = new THREE.Vector3();
    
    if (player.controls.forward) moveDirection.z -= 1;
    if (player.controls.backward) moveDirection.z += 1;
    if (player.controls.left) moveDirection.x -= 1;
    if (player.controls.right) moveDirection.x += 1;
    
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.multiplyScalar(player.moveSpeed);
        
        // 应用玩家旋转
        moveDirection.applyEuler(new THREE.Euler(0, player.rotation.y, 0));
        
        player.position.add(moveDirection);
        
        // 简单的边界检查
        player.position.x = THREE.MathUtils.clamp(player.position.x, -45, 45);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -45, 45);
    }
}

function updatePhysics() {
    // 更新方块物理
    boxes.forEach(box => {
        // 应用重力
        box.userData.velocity.y += PHYSICS.gravity;
        
        // 更新位置
        box.position.add(box.userData.velocity);
        
        // 应用旋转
        box.rotation.y += box.userData.angularVelocity;
        
        // 地面碰撞
        if (box.position.y < 0.5) {
            box.position.y = 0.5;
            box.userData.velocity.y *= -PHYSICS.elasticity;
            box.userData.velocity.x *= PHYSICS.friction;
            box.userData.velocity.z *= PHYSICS.friction;
        }
        
        // 应用旋转摩擦
        box.userData.angularVelocity *= PHYSICS.angularFriction;
        
        // 速度衰减
        box.userData.velocity.multiplyScalar(0.95);
    });
    
    // 更新巨石物理
    if (boulder) {
        // 应用重力
        boulder.userData.velocity.y += PHYSICS.gravity;
        
        // 应用摩擦力
        boulder.userData.velocity.multiplyScalar(PHYSICS.boulderFriction);
        boulder.userData.angularVelocity.multiplyScalar(PHYSICS.angularFriction);
        
        // 更新位置
        boulder.position.add(boulder.userData.velocity);
        
        // 更新旋转
        boulder.rotation.y += boulder.userData.angularVelocity.y;
        
        // 检查巨石是否滚回山脚
        if (boulder.position.z > 0) {
            boulder.position.set(0, PHYSICS.boulderRadius, -PHYSICS.hillRadius);
            boulder.userData.velocity.set(0, 0, 0);
            boulder.userData.angularVelocity.set(0, 0, 0);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // 地球旋转
    if (earth) earth.rotation.y += 0.005;
    
    // 更新物理
    updatePhysics();
    
    // 更新玩家位置
    updatePlayerPosition();
    
    // 更新相机位置和旋转
    camera.position.copy(player.position);
    camera.quaternion.setFromEuler(player.rotation);
    
    // 渲染场景
    renderer.render(scene, camera);
    
    // 更新调试信息
    document.getElementById('debug').textContent = 
        `位置: X${player.position.x.toFixed(1)} Y${player.position.y.toFixed(1)} Z${player.position.z.toFixed(1)}\n` +
        `视角: 水平${(player.rotation.y * 180/Math.PI).toFixed(1)}° 垂直${(player.rotation.x * 180/Math.PI).toFixed(1)}°`;
}

function handleError(err) {
    const errorMsg = `错误: ${err.message}`;
    console.error(err);
    document.getElementById('debug').textContent = errorMsg;
    alert(errorMsg);
}

// 窗口大小调整
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 启动场景
init();

