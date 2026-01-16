// Angle preset management
let importAnglePresetButton;
let exportAnglePresetButton;

let importHytaleMobModelButton;
let importHytaleItemModelButton;

let takeHytaleWikiScreenshotButton;

let automaticMobScreenShotButton;
let automaticItemScreenShotButton;

const buttons = [
    importAnglePresetButton,
    exportAnglePresetButton,

    importHytaleMobModelButton,
    importHytaleItemModelButton,

    takeHytaleWikiScreenshotButton,

    automaticMobScreenShotButton,
    automaticItemScreenShotButton,
];

const error = (text) => {
    Blockbench.showMessageBox({ title: "An error occured", message: text });
}

const info = (text) => {
    Blockbench.showToastNotification({ text });
}

const loadPresets = () => {
    let presets = localStorage.getItem('camera_presets');

    try {
        presets = JSON.parse(presets) || [];
    } catch (err) {
        presets = [];
    }

    return presets;
}

const getPreset = (name) => {
    return loadPresets().find(p => p.name = name);
}

const fs = require("fs");
const nodepath = require("node:path");

const findFiles = (basepath, extensions, recursive = false) => {
    const results = [];
    const items = fs.readdirSync(basepath);

    for (const item of items) {
        const path = nodepath.join(basepath, item);
        if (fs.statSync(path).isDirectory()) {
            if (recursive) {
                results.push(...findFiles(path, extensions));
            }
        } else {
            if (extensions.includes(item.split(".")[1])) {
                results.push(path);
            }
        }
    }
    return results;
}

const importItemModel = (modelDir) => {
    // todo: validate folder structure

    // todo: error handling if something wasn't found

    const modelsDir = `${modelDir}/`;

    // todo: handle multiple variations

    // Create a new project

    if (!Project.selected) {
        // todo: infer from the file ('format' json property)
        // either character or prop
        const project = new ModelProject("hytale_prop");
        if (!project.select()) {
            error("Could not create project.");
            return;
        }
    }

    const models = findFiles(modelsDir, ["blockymodel"], false);
    const textures = findFiles(modelsDir, ["png"], false);

    Blockbench.read(models, {}, (files) => {
        files.forEach(file => {
            loadModelFile(file);
        });
    });

    Blockbench.read(textures, { readtype: 'image' }, (files) => {
        files.forEach(f => {
            new Texture({ name: f.name })
                .fromFile(f)
                .add(false, true)
                .fillParticle();
        });
    });

    return [models, textures];
}

const importMobModel = (modelDir) => {
    // todo: validate folder structure

    // todo: error handling if something wasn't found

    const animationsDir = `${modelDir}/Animations/`;
    const modelsDir = `${modelDir}/Models/`;

    // todo: handle multiple variations

    // Create a new project

    if (!Project.selected) {
        // todo: infer from the file ('format' json property)
        // either character or prop
        const project = new ModelProject("hytale_character");
        if (!project.select()) {
            error("Could not create project.");
            return;
        }
    }

    const animations = findFiles(animationsDir, ["blockyanim"], true);
    const models = findFiles(modelsDir, ["blockymodel"], false);
    const textures = findFiles(modelsDir, ["png"], false);

    Blockbench.read(animations, {}, (files) => {
        files.forEach(file => {
            Animator.importFile(file, false);
        });
    });

    Blockbench.read(models, {}, (files) => {
        files.forEach(file => {
            loadModelFile(file);
        });
    });

    Blockbench.read(textures, { readtype: 'image' }, (files) => {
        files.forEach(f => {
            new Texture({ name: f.name })
                .fromFile(f)
                .add(false, true)
                .fillParticle();
        });
    });

    return [models, textures, animations];
}

const takeHytaleWikiScreenshot = () => {
    // if (!Animation.selected) {
    //     error("First select an animation please.");
    //     return;
    // }

    // Timeline.setTime(0);
    // Animator.preview(true);

    const anglePresetKey = "hytalewiki";

    const anglePreset = getPreset(anglePresetKey);

    Preview.selected.loadAnglePreset(anglePreset);

    // Default options
    const screenshotOptions = {
        resolution: [800, 800],
        angle_preset: 'view',
        shading: false,
        anti_aliasing: 'none',
        show_gizmos: false
    };

    Screencam.advancedScreenshot(Preview.selected, screenshotOptions, (dataUrl) => {
        (async () => {
            const frame = new CanvasFrame();
            await frame.loadFromURL(dataUrl);
            frame.autoCrop();

            let borderedCanvas = document.createElement('canvas');
            let borderedCtx = borderedCanvas.getContext('2d');

            borderedCanvas.width = frame.width + 40;
            borderedCanvas.height = frame.height + 40;

            borderedCtx.drawImage(frame.canvas, 20, 20);

            const finalFrame = new CanvasFrame();
            finalFrame.canvas = borderedCanvas;
            finalFrame.ctx = borderedCtx;

            Screencam.returnScreenshot(finalFrame.canvas.toDataURL());
        })();
    });
}

Plugin.register('hytalewiki', {
    title: 'Hytalewiki Utility Plugin',
    author: 'Wertiik',
    icon: 'hytale',
    description: 'Import mob and item models, take screenshots.',
    version: '0.0.1',
    variant: 'both',
    onload() {
        // Save the location of game assets

        // Open dialog to select a model from all assets (maybe first just select folder)
        // Load model + texture + animations

        // Another action to create a screenshot according to standards
        // Choose either Block / Item / Mob

        automaticItemScreenShotButton = new Action("hytalewiki.automatic_screenshot.item", {
            name: "Automatic Item Screenshot",
            description: "Make an automatic item screenshot.",
            icon: "precision_manufacturing",
            click: () => {
                const modelDir = Blockbench.pickDirectory({
                    title: "Select Item Model Folder",
                    resource_id: "hytale_model_browser-base_model_folder.items"
                });

                importItemModel(modelDir);

                // Go through projects and take a screenshot of each.

                let idx = 0;
                const screenshotProject = (idx) => {
                    if (idx >= ModelProject.all.length) {
                        console.log("done.");
                        return;
                    }

                    const project = ModelProject.all[idx];
                    console.log(project.name);
                    project.select();

                    setTimeout(() => {
                        takeHytaleWikiScreenshot();
                        screenshotProject(idx + 1);
                    }, 3);
                }
                screenshotProject(0);
            }
        });

        importHytaleItemModelButton = new Action("hytalewiki.import_model.item", {
            name: "Import Hytale Item Model",
            description: "Import Hytale Item Model.",
            icon: "arrow_downward",
            click: () => {
                 const modelDir = Blockbench.pickDirectory({
                    title: "Select Item Model Folder",
                    resource_id: "hytale_model_browser-base_model_folder.items"
                });

                importItemModel(modelDir);
            }
        });

        importHytaleMobModelButton = new Action("hytalewiki.import_model.mob", {
            name: "Import Hytale Mob Model",
            description: "Import Hytale Mob model.",
            icon: "arrow_downward",
            click: () => {
                const modelDir = Blockbench.pickDirectory({
                    title: "Select Base Mob Model Folder",
                    resource_id: "hytale_model_browser-base_model_folder"
                });

                importMobModel(modelDir);
            }
        });

        automaticMobScreenShotButton = new Action("hytalewiki.automatic_screenshot.mob", {
            name: "Automatic Mob Screenshot",
            description: "Make an automatic mob screenshot.",
            icon: "precision_manufacturing",
            click: () => {
                const modelDir = Blockbench.pickDirectory({
                    title: "Select Base Mob Model Folder",
                    resource_id: "hytale_model_browser-base_model_folder"
                });

                // console.log("joining animator");
                // Modes.options.animate.select();
                // Animator.join();

                // Import model
                const [models, textures, animations] = importMobModel(modelDir);

                takeHytaleWikiScreenshot();
                return;

                // NOTE: skip animations for now
                // cannot get it to load animations properly and switch to animation mode
                // ...takes a blank screenshot everytime 

                let waiting = false;

                const takePicture = () => {
                    if (!waiting || Animation.all.length === 0) {
                        console.log("ignored animation frame", animations.length, Animation.all.length);
                        return;
                    }

                    waiting = false;

                    console.log(Animation.all.length);

                    console.log("Animations loaded?");

                    // Select idle animation
                    console.log("animations", Blockbench.Animation.all);
                    for (const animation of Blockbench.Animation.all) {
                        if (animation.name.match(/idle/i)) {
                            console.log("Chose idle animation " + animation.name);
                            animation.select();
                        }
                    }

                    console.log("taking screenshot");

                    takeHytaleWikiScreenshot();
                };

                // Wait for first frame render to take the screenshot.
                // Blockbench.on("display_animation_frame", () => {
                //     takePicture();
                // });

                waiting = true;
                takePicture();
                console.log("waiting for animation load");
            }
        });

        exportAnglePresetButton = new Action("hytalewiki.export_angle_preset", {
            name: "Export Angle Presets",
            description: "Export angle presets into JSON.",
            icon: "upload",
            click: function () {
                // select which to export

                let presets = loadPresets();

                const options = {};

                presets.forEach(preset => {
                    options[preset.name] = preset;
                });

                const resultDialog = (result) => new Dialog("hytalewiki.export_angle_preset.result", {
                    title: "Result JSON for the angle presets",
                    form: {
                        display: {
                            type: "textarea",
                            value: result,
                            share_text: true
                        }
                    },
                });

                const pickDialog = new Dialog("hytalewiki.export_angle_preset.pick", {
                    title: "Export angle presets into JSON.",
                    form: {
                        chosenPresets: {
                            type: "inline_multi_select",
                            options: options
                        },
                    },
                    onConfirm: function (data) {
                        pickDialog.hide();

                        if (!data.chosenPresets) {
                            error("No preset chosen.");
                            return;
                        }

                        const resultPresets = [];
                        Object.entries(data.chosenPresets).forEach(([k, v]) => {
                            if (v) {
                                resultPresets.push(options[k]);
                            }
                        });

                        console.log(resultPresets);

                        const result = JSON.stringify(resultPresets, null, 2);

                        resultDialog(result).build().show();
                    }
                });

                pickDialog.build().show();
            }
        });

        importAnglePresetButton = new Action("hytalewiki.import_angle_preset", {
            name: "Import Angle Presets",
            description: "Import angle presets.",
            icon: "download",
            click: function () {
                const angleDialog = new Dialog("hytalewiki.import_angle_preset.input", {
                    title: "Import angle preset from a json config.",
                    form: {
                        jsonContent: {
                            type: "textarea",
                            placeholder: "Paste your angle preset JSON here."
                        }
                    },
                    buttons: ["Import"],
                    onConfirm: function (data) {
                        angleDialog.hide();

                        if (!data.jsonContent) {
                            error("No JSON data submitted.");
                            return;
                        }

                        let importedPresets;
                        try {
                            importedPresets = JSON.parse(data.jsonContent);
                        } catch (e) {
                            error("Invalid JSON. Failed to parse.");
                            return;
                        }

                        if (!Array.isArray(importedPresets)) {
                            importedPresets = [importedPresets];
                        }

                        let presets = localStorage.getItem('camera_presets');

                        try {
                            presets = JSON.parse(presets) || [];
                        } catch (err) {
                            presets = [];
                        }

                        for (const preset of importedPresets) {
                            if (presets.find(p => p.name == preset.name)) {
                                // todo: dialog, allow overwrite
                                error("Angle preset with the name " + preset.name + " already exists.");
                                return;
                            }

                            presets.push(preset);
                        }

                        localStorage.setItem('camera_presets', JSON.stringify(presets));

                        info("Imported angle presets " + presets.map(p => p.name).join(", ") + "!");
                    }
                });

                angleDialog.build().show();
            }
        });

        takeHytaleWikiScreenshotButton = new Action("hytaalewiki.take_screenshot", {
            name: "Take Hytalewiki Screenshot",
            description: "Take a Hytalewiki.org preset screenshot.",
            icon: "linked_camera",
            click: function () {
                takeHytaleWikiScreenshot();
            }
        });

        buttons.forEach(b => MenuBar.addAction(b));
    },
    onunload() {
        buttons.forEach(b => b.delete());
    }
});
