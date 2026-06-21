import { loadCSS } from './file_loader.js';

let space_fillers_stylesheet;

export async function init() {
    space_fillers_stylesheet = loadCSS('sheets/space_fillers.css');
    
    autofillSpacefillers();
}

const shapeElementType = 'div';
const baseShapeClass = 'space_filler_shape';
const autofillContainers = document.querySelectorAll('.space_filler_container.autofill');

function autofillSpacefillers() {
    const combinations = [
        [ "circle1", "polygon4", "circle6", "triangle3", "triangle4", "polygon3", "polygon1", "circle2", "triangle5", "polygon6", "circle7" ],
        [ "polygon2", "triangle6", "circle5", "polygon1", "circle4", "triangle5", "circle1", "polygon5", "triangle3", "circle7", "triangle1" ],
        [ "circle3", "triangle1", "triangle7", "polygon6", "circle7", "polygon4", "circle1", "triangle4", "polygon2", "circle5" ],
        [ "circle6", "polygon4", "triangle3", "polygon1", "circle5", "triangle2", "polygon5", "circle2", "triangle7", "polygon3", "circle7" ],
        [ "circle1", "polygon2", "triangle6", "triangle4", "polygon5", "circle7", "polygon1", "circle3", "triangle5", "circle5", "polygon3" ],
        [ "polygon4", "triangle1", "circle3", "triangle2", "polygon3", "circle4", "polygon6", "triangle7", "circle1", "triangle6" ],
        [ "circle1", "triangle3", "polygon1", "triangle7", "polygon6", "circle2", "polygon2", "circle4", "triangle4", "polygon5", "circle5" ],
        [ "circle6", "polygon4", "triangle3", "polygon1", "triangle7", "polygon6", "circle7", "circle2", "triangle2", "polygon5", "circle4", "triangle5" ],
        [ "circle1", "triangle6", "polygon5", "triangle2", "circle7", "polygon3", "circle4", "triangle3", "polygon1", "circle3" ],
        [ "circle3", "polygon2", "triangle4", "polygon1", "triangle5", "circle2", "circle6", "polygon6", "triangle7", "circle4", "polygon5" ]
    ];
    autofillContainers.forEach(function(container) {
        const randNum = Math.floor(Math.random() * combinations.length);
        const combination = combinations[randNum];
        
        combination.forEach(function(shapeClass) {
            const shapeElement = document.createElement(shapeElementType);
            shapeElement.classList.add(baseShapeClass);
            shapeElement.classList.add(shapeClass);
            container.appendChild(shapeElement);
        });
    });
}