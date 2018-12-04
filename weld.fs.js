FeatureScript 951;

/**
 * This module is distributed under the MIT License.
 * See the LICENSE tab for the license text.
 * Support and maintenance: https://github.com/mbartlett21/weld-featurescript
 * Report issues here: https://github.com/mbartlett21/weld-featurescript/issues
 */

// Imported Enums
import(path : "onshape/std/booleanoperationtype.gen.fs", version : "951.0");
import(path : "onshape/std/boundingtype.gen.fs", version : "951.0");

// Imports used internally
import(path : "onshape/std/containers.fs", version : "951.0");
import(path : "onshape/std/curveGeometry.fs", version : "951.0");
import(path : "onshape/std/evaluate.fs", version : "951.0");
import(path : "onshape/std/feature.fs", version : "951.0");
import(path : "onshape/std/geomOperations.fs", version : "951.0");
import(path : "onshape/std/math.fs", version : "951.0");
import(path : "onshape/std/properties.fs", version : "951.0");
import(path : "onshape/std/sketch.fs", version : "951.0");
import(path : "onshape/std/surfaceGeometry.fs", version : "951.0");
import(path : "onshape/std/topologyUtils.fs", version : "951.0");
import(path : "onshape/std/units.fs", version : "951.0");
import(path : "onshape/std/valueBounds.fs", version : "951.0");
import(path : "onshape/std/vector.fs", version : "951.0");

// Bounds and enums {
/**
 * Density bounds.
 */
export const DENSITY_BOUNDS = {
            (unitless) : [0, 7.85, 100]
        } as RealBoundSpec;

/**
 * Feature and settings options
 * @value FEATURE : Weld Feature.
 * @value SETTINGS : Weld Settings.
 */
export enum WeldFeatureSettingsSelection
{
    annotation { "Name" : "Welds" }
    FEATURE,
    annotation { "Name" : "Settings" }
    SETTINGS,
    annotation { "Hidden" : true }
    SHOW_ALL
}

/**
 * Specifies the type of welding.
 * @value FILLET_WELD : Fillet weld.
 * @value V_BUTT_WELD : V-Butt weld (beta).
 * @value DOUBLE_V_BUTT_WELD : Double V-Butt weld (beta).
 * @value SQUARE_BUTT_WELD : Square Butt weld (ToDo).
 * @value U_BUTT_WELD : U-Butt weld (ToDo).
 * @value J_BUTT_WELD : J-Butt weld (ToDo).
 */
export enum WeldType
{
    annotation { "Name" : "Fillet weld" }
    FILLET_WELD,
    annotation { "Name" : "V-Butt weld (beta)" }
    V_BUTT_WELD,
    annotation { "Name" : "Double V-Butt weld (beta)" }
    DOUBLE_V_BUTT_WELD,
    annotation { "Name" : "Square Butt weld (ToDo)" }
    SQUARE_BUTT_WELD,
    annotation { "Name" : "U-Butt weld (ToDo)" }
    U_BUTT_WELD,
    annotation { "Name" : "J-Butt weld (ToDo)" }
    J_BUTT_WELD
}

/**
 * Specifies the shape of the welding.
 * @value CONVEX : Convex.
 * @value CONCAVE : Concave.
 * @value FLAT : Flat.
 */
export enum FilletShape
{
    annotation { "Name" : "Convex" }
    CONVEX,
    annotation { "Name" : "Concave" }
    CONCAVE,
    annotation { "Name" : "Flat" }
    FLAT
}

/**
 * Specifies the shape of fillet corners.
 * @value ROUND : Round.
 * @value MITER : Miter.
 * @value NONE : None.
 */
export enum FilletCornerShape
{
    annotation { "Name" : "Round" }
    ROUND,
    annotation { "Name" : "Miter" }
    MITER,
    annotation { "Name" : "None" }
    NONE
}

/**
 * Specifies the shape of Butt.
 * @value CONVEX : Convex.
 * @value FLAT : Flat.
 */
export enum ButtShape
{
    annotation { "Name" : "Convex" }
    CONVEX,
    annotation { "Name" : "Flat" }
    FLAT
}

// Bounds and enums }

annotation { "Feature Type Name" : "Weld" }
export const weld = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        annotation { "Name" : "Weld Settings", "UIHint" : ["HORIZONTAL_ENUM", "REMEMBER_PREVIOUS_VALUE"] }
        definition.WeldFeatureSettingsSelection is WeldFeatureSettingsSelection;

        if (definition.WeldFeatureSettingsSelection != WeldFeatureSettingsSelection.SETTINGS)
        {
            annotation { "Name" : "Weld Type", "UIHint" : ["REMEMBER_PREVIOUS_VALUE", "SHOW_LABEL"] }
            definition.weldType is WeldType;

            if (definition.weldType == WeldType.FILLET_WELD)
            {
                annotation { "Name" : "Side 1", "Filter" : EntityType.FACE }
                definition.filletEntities1 is Query;

                annotation { "Name" : "Side 2", "Filter" : EntityType.FACE }
                definition.filletEntities2 is Query;

                annotation { "Name" : "Shape", "UIHint" : ["REMEMBER_PREVIOUS_VALUE", "SHOW_LABEL"] }
                definition.filletShape is FilletShape;

                annotation { "Name" : "Weld size", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
                isLength(definition.filletSize, BLEND_BOUNDS);

                annotation { "Name" : "Tangent propagation" }
                definition.filletPropagation is boolean;

                annotation { "Name" : "Corner style", "UIHint" : ["REMEMBER_PREVIOUS_VALUE", "SHOW_LABEL"] }
                definition.filletCornerShape is FilletCornerShape;
            }
            else
            {
                annotation { "Name" : "Welded edge", "Filter" : EntityType.EDGE }
                definition.buttEdge is Query;

                annotation { "Name" : "Shape", "UIHint" : ["REMEMBER_PREVIOUS_VALUE", "SHOW_LABEL"] }
                definition.buttShape is ButtShape;

                if (definition.weldType == WeldType.SQUARE_BUTT_WELD)
                {
                    annotation { "Name" : "Distance", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
                    isLength(definition.buttDist, BLEND_BOUNDS);
                }

                if (definition.weldType == WeldType.V_BUTT_WELD || definition.weldType == WeldType.DOUBLE_V_BUTT_WELD)
                {
                    annotation { "Name" : "Angle", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
                    isAngle(definition.buttAngle, ANGLE_STRICT_180_BOUNDS);
                }

                if (definition.weldType == WeldType.U_BUTT_WELD || definition.weldType == WeldType.J_BUTT_WELD)
                {
                    annotation { "Name" : "Radius", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
                    isLength(definition.buttRadius, BLEND_BOUNDS);
                }

                annotation { "Name" : "Root Gap", "UIHint" : "REMEMBER_PREVIOUS_VALUE", "Default" : true }
                definition.buttRootGap is boolean;

                if (definition.buttRootGap)
                {
                    annotation { "Name" : "Root width", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
                    isLength(definition.buttRootGapWidth, SHELL_OFFSET_BOUNDS);

                    annotation { "Name" : "Root height", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
                    isLength(definition.buttRootGapHeight, SHELL_OFFSET_BOUNDS);
                }
            }
        }
        else
        {
            annotation { "Name" : "Density (g/cm^3)", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
            isReal(definition.density, DENSITY_BOUNDS);

            annotation { "Name" : "Exclude from BOM", "UIHint" : "REMEMBER_PREVIOUS_VALUE", "Default" : true }
            definition.excludeFromBom is boolean;
            
            annotation { "Name" : "Color Red", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
            isReal(definition.colorRed, { (unitless) : [0.0, 0.25, 1] } as RealBoundSpec);

            annotation { "Name" : "Color Green", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
            isReal(definition.colorGreen, { (unitless) : [0.0, 0.25, 1] } as RealBoundSpec);

            annotation { "Name" : "Color Blue", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
            isReal(definition.colorBlue, { (unitless) : [0.0, 0.25, 1] } as RealBoundSpec);

            annotation { "Name" : "Transparency %", "UIHint" : "REMEMBER_PREVIOUS_VALUE" }
            isReal(definition.colorTransparency, { (unitless) : [0.0, 0, 100] } as RealBoundSpec);
        }
    }
    {
        var toDelete = new box([]);
        if (definition.weldType == WeldType.FILLET_WELD)
        {
            filletWeld(context, id, definition, toDelete);
        }
        else if (definition.weldType == WeldType.V_BUTT_WELD || definition.weldType == WeldType.DOUBLE_V_BUTT_WELD || definition.weldType == WeldType.SQUARE_BUTT_WELD || definition.weldType == WeldType.U_BUTT_WELD || definition.weldType == WeldType.J_BUTT_WELD)
        {
            buttWeld(context, id, definition, toDelete);
        }
        else
            throw regenError("Weld type not supported", ["weldType"]);

        if (evaluateQuery(context, qUnion(toDelete[])) != [])
            opDeleteBodies(context, id + "delete", {
                        "entities" : qUnion(toDelete[])
                    });

        if (evaluateQuery(context, qCreatedBy(id, EntityType.BODY)) != [])
        {
            setProperty(context, {
                        "entities" : qCreatedBy(id, EntityType.BODY),
                        "propertyType" : PropertyType.MATERIAL,
                        "value" : material("Weld", definition.density * gram / centimeter ^ 3)
                    });

            setProperty(context, {
                        "entities" : qCreatedBy(id, EntityType.BODY),
                        "propertyType" : PropertyType.APPEARANCE,
                        "value" : color(definition.colorRed, definition.colorGreen, definition.colorBlue, (100 - definition.colorTransparency) / 100.0)
                    });

            setProperty(context, {
                        "entities" : qCreatedBy(id, EntityType.BODY),
                        "propertyType" : PropertyType.EXCLUDE_FROM_BOM,
                        "value" : definition.excludeFromBom
                    });
        }
        else
            throw regenError("Weld failed");
    },
        {
            weldFeatureSettingsSelection : WeldFeatureSettingsSelection.SHOW_ALL,
            filletPropagation : false,
        }
    );

// Fillet functions {
function filletWeld(context is Context, id is Id, definition is map, toDelete is box)
{
    var cornerShape = definition.filletCornerShape;
    var propagate = definition.filletPropagation;

    var endFaces = new box([]);

    if (evaluateQuery(context, qIntersection([definition.filletEntities1, definition.filletEntities2])) != [])
        throw regenError("Faces cannot be in both sides", ["filletEntities1", "filletEntities2"], qIntersection([definition.filletEntities1, definition.filletEntities2]));
    var faces1 = evaluateQuery(context, propagate ? qTangentConnectedFaces(definition.filletEntities1) : definition.filletEntities1);
    var faces2 = evaluateQuery(context, propagate ? qTangentConnectedFaces(definition.filletEntities2) : definition.filletEntities2);
    if (size(faces1) < 1)
        throw regenError("One face must be selected for side 1", ["filletEntities1"]);
    if (size(faces2) < 1)
        throw regenError("One face must be selected for side 2", ["filletEntities2"]);
    var faceDefs1 = [];
    for (var face1 in faces1)
        faceDefs1 = append(faceDefs1, evSurfaceDefinition(context, { "face" : face1 }));
    var faceDefs2 = [];
    for (var face2 in faces2)
        faceDefs2 = append(faceDefs2, evSurfaceDefinition(context, { "face" : face2 }));
    var counter = new box(0);
    var welds = [];
    for (var i = 0; i < size(faces1); i += 1)
    {
        for (var j = 0; j < size(faces2); j += 1)
        {
            var filletId = id + unstableIdComponent(counter[]);
            counter[] += 1;
            try
            {
                var weldPart;
                var dist = evDistance(context, {
                            "side0" : faces1[i],
                            "side1" : faces2[j]
                        }).distance;
                if (dist > definition.filletSize && !tolerantEquals(definition.filletSize, dist))
                    continue;
                var filletDef = {
                    "face1" : faces1[i],
                    "face2" : faces2[j],
                    "face1Def" : faceDefs1[i],
                    "face2Def" : faceDefs2[j],
                    "filletShape" : definition.filletShape,
                    "filletSize" : definition.filletSize,
                    "filletPropagation" : definition.filletPropagation
                };
                setExternalDisambiguation(context, filletId, filletDef.face1);

                if (faceDefs1[i] is Plane && faceDefs2[j] is Plane)
                    weldPart = filletWeldPlanar(context, filletId, filletDef, toDelete, endFaces);

                else if (!(faceDefs1[i] is Plane) && faceDefs2[j] is Plane)
                    weldPart = filletWeldNonPlanarPlanar(context, filletId, filletDef, toDelete, endFaces);

                else if (faceDefs1[i] is Plane && !(faceDefs2[j] is Plane))
                {
                    filletDef = mergeMaps(filletDef, {
                                "face1" : faces2[j],
                                "face2" : faces1[i],
                                "face1Def" : faceDefs2[j],
                                "face2Def" : faceDefs1[i],
                            });
                    weldPart = filletWeldNonPlanarPlanar(context, filletId, filletDef, toDelete, endFaces);
                }
                else
                    reportFeatureInfo(context, id, "Non-Planar to Non-Planar welds are not supported yet.");
                if (weldPart is Query)
                    welds = append(welds, weldPart);
            }
            processSubfeatureStatus(context, id, {
                        "subfeatureId" : filletId,
                        "propagateErrorDisplay" : true
                    });
        }
    }
    if (cornerShape == FilletCornerShape.ROUND && endFaces[] != [] && size(evaluateQuery(context, qOwnerBody(qUnion(endFaces[])))) > 1)
    {
        welds = append(welds, roundEnds(context, id + "round", qUnion(endFaces[])));
    }
    if (cornerShape == FilletCornerShape.MITER && endFaces[] != [] && size(evaluateQuery(context, qOwnerBody(qUnion(endFaces[])))) > 1)
    {
        miterEnds(context, id + "miter", qUnion(endFaces[]));
    }
    if (size(evaluateQuery(context, qUnion(welds))) >= 2)
        opBoolean(context, id + "booleanTogether", {
                    "tools" : qUnion(welds),
                    "operationType" : BooleanOperationType.UNION
                });
    setWeldNumbers(context, definition, qUnion(welds));
}

function filletWeldPlanar(context is Context, id is Id, definition is map, toDelete is box, endFaces is box)
{
    var face1 = definition.face1;
    var face1Plane = definition.face1Def;

    var face2 = definition.face2;
    var face2Plane = definition.face2Def;

    var shape is FilletShape = definition.filletShape;

    var intersectionLine = intersection(face1Plane, face2Plane);

    if (intersectionLine is undefined)
        return;

    var skPlane = plane(intersectionLine.origin, intersectionLine.direction);
    var face1Dir = cross(skPlane.normal, face1Plane.normal);

    var face2Dir = -cross(skPlane.normal, face2Plane.normal);

    var angle = angleBetween(face1Dir, face2Dir);
    var size = definition.filletSize / sin(angle);

    var face1Point = worldToPlane(skPlane, intersectionLine.origin + face1Dir * size);
    var face1SkDir = normalize(face1Point);

    var face2Point = worldToPlane(skPlane, intersectionLine.origin + face2Dir * size);
    var face2SkDir = normalize(face2Point);
    var dist = size * cos(angle / 2); // Distance of a straight line out

    // Sketch
    var sketch = newSketchOnPlane(context, id + "sketch", {
            "sketchPlane" : skPlane
        });
    skLineSegment(sketch, "face1Line", {
                "start" : vector(0, 0) * inch,
                "end" : face1Point
            });
    skLineSegment(sketch, "face2Line", {
                "start" : vector(0, 0) * inch,
                "end" : face2Point
            });
    if (shape != FilletShape.FLAT)
    {
            skArc(sketch, "arc", {
                "start" : face1Point,
                "mid" : normalize(face1SkDir + face2SkDir) * dist * (shape == FilletShape.CONVEX ? 1.15 : 0.75),
                "end" : face2Point
            });
    }
    else
    {
            skLineSegment(sketch, "face3Line", {
                "start" : face1Point,
                "end" : face2Point
            });
    }
    skSolve(sketch);
    toDelete[] = append(toDelete[], qCreatedBy(id + "sketch"));

    // Sketch face
    var sketchFace = qCreatedBy(id + "sketch", EntityType.FACE);

    var extrudeDef = {
        "entities" : sketchFace,
        "direction" : skPlane.normal,
        "startBound" : BoundingType.THROUGH_ALL,
        "endBound" : BoundingType.THROUGH_ALL
    };
    var extrudeId = id + "extrude";

    opExtrude(context, extrudeId, extrudeDef);
    var subId = id + "trim";

    // Cut weld
    opExtrude(context, subId + "extrude1", {
                "entities" : face1,
                "direction" : face2Dir,
                "endBound" : BoundingType.BLIND,
                "endDepth" : size
            });

    opExtrude(context, subId + "extrude2", {
                "entities" : face2,
                "direction" : face1Dir,
                "endBound" : BoundingType.BLIND,
                "endDepth" : size
            });

    opBoolean(context, subId + "booleanCut", {
                "tools" : qUnion([qCreatedBy(extrudeId, EntityType.BODY), qCreatedBy(subId + "extrude1", EntityType.BODY), qCreatedBy(subId + "extrude2", EntityType.BODY)]),
                "operationType" : BooleanOperationType.INTERSECTION
            });

    // Extend faces to part again
    var faceQ1 = qParallelPlanes(qOwnedByBody(qOwnerBody(qUnion([qCreatedBy(subId + "extrude1", EntityType.FACE), qCreatedBy(subId + "extrude2", EntityType.FACE)])), EntityType.FACE), -face1Plane.normal, false);
    var faceQ2 = qParallelPlanes(qOwnedByBody(qOwnerBody(qUnion([qCreatedBy(subId + "extrude1", EntityType.FACE), qCreatedBy(subId + "extrude2", EntityType.FACE)])), EntityType.FACE), -face2Plane.normal, false);
    if (evaluateQuery(context, faceQ1) != [])
        opReplaceFace(context, subId + "replaceFace1", {
                    "replaceFaces" : faceQ1,
                    "templateFace" : face1,
                    "oppositeSense" : true
                });
    if (evaluateQuery(context, faceQ2) != [])
        opReplaceFace(context, subId + "replaceFace2", {
                    "replaceFaces" : faceQ2,
                    "templateFace" : face2,
                    "oppositeSense" : true
                });

    // Endfaces for rounded ends
    endFaces[] = append(endFaces[], qSubtraction(
                qGeometry(qOwnedByBody(qOwnerBody(qUnion([qCreatedBy(subId + "extrude1", EntityType.FACE), qCreatedBy(subId + "extrude2", EntityType.FACE)])), EntityType.FACE), GeometryType.PLANE),
                qUnion([faceQ1, faceQ2])
            ));

    return qCreatedBy(subId + "booleanCut", EntityType.BODY);
}

function filletWeldNonPlanarPlanar(context is Context, id is Id, definition is map, toDelete is box, endFaces is box)
{
    var face1 = definition.face1;
    var face1Def = definition.face1Def;

    var face2 = definition.face2;
    var face2Plane = definition.face2Def;

    var doSweepLine = false;
    if (face1Def is Cylinder && perpendicularVectors(face1Def.coordSystem.zAxis, face2Plane.normal))
        doSweepLine = true;

    var shape is FilletShape = definition.filletShape;
    var size = definition.filletSize;

    var distResult = evDistance(context, {
            "side0" : face1,
            "side1" : face2,
            "extendSide1" : true
        });

    var face1Plane = evFaceTangentPlane(context, {
            "face" : face1,
            "parameter" : distResult.sides[0].parameter
        });

    var weldEdge = qClosestTo(
        doSweepLine ?
        qGeometry(qEdgeAdjacent(face1, EntityType.EDGE), GeometryType.LINE) :
        qSubtraction(
                qEdgeAdjacent(face1, EntityType.EDGE),
                qGeometry(
                    qEdgeAdjacent(face1, EntityType.EDGE),
                    GeometryType.LINE
                )
            ),
        distResult.sides[0].point
    );


    var intersectionLine = intersection(face1Plane, face2Plane);

    var skPlane = plane(project(intersectionLine, distResult.sides[0].point), intersectionLine.direction);
    var face1Dir = cross(skPlane.normal, face1Plane.normal);
    var face1Point = worldToPlane(skPlane, intersectionLine.origin + face1Dir * size);
    var face1SkDir = normalize(face1Point);

    var face2Dir = -cross(skPlane.normal, face2Plane.normal);
    var face2Point = worldToPlane(skPlane, intersectionLine.origin + face2Dir * size);
    var face2SkDir = normalize(face2Point);

    var angle = angleBetween(face1Dir, face2Dir);
    var dist = size * cos(angle / 2); // Distance of a straight line out
    // Sketch
    var sketch = newSketchOnPlane(context, id + "sketch", {
            "sketchPlane" : skPlane
        });
    skLineSegment(sketch, "face1Line", {
                "start" : vector(0, 0) * inch,
                "end" : face1Point
            });
    skLineSegment(sketch, "face2Line", {
                "start" : vector(0, 0) * inch,
                "end" : face2Point
            });
    if (shape != FilletShape.FLAT)
    {
            skArc(sketch, "arc", {
                "start" : face1Point,
                "mid" : normalize(face1SkDir + face2SkDir) * dist * (shape == FilletShape.CONVEX ? 1.15 : 0.75),
                "end" : face2Point
            });
    }
    else
    {
            skLineSegment(sketch, "face3Line", {
                "start" : face1Point,
                "end" : face2Point
            });
    }
    skSolve(sketch);
    toDelete[] = append(toDelete[], qCreatedBy(id + "sketch"));

    // Weld Faces
    var weldFace1 = qEntityFilter(
        startTrackingSweep(
            context,
            id + "sketch",
            "face1Line",
            weldEdge
        ),
        EntityType.FACE
    );
    var weldFace2 = qEntityFilter(
        startTrackingSweep(
            context,
            id + "sketch",
            "face1Line",
            weldEdge
        ),
        EntityType.FACE
    );

    // Sketch face
    var sketchFace = qCreatedBy(id + "sketch", EntityType.FACE);

    var sweepDef = {
        "profiles" : sketchFace,
        "path" : weldEdge
    };
    try
    {
        opSweep(context, id + "sweep", sweepDef);
    }
    processSubfeatureStatus(context, id, {
                "subfeatureId" : id + "sweep",
                "propagateErrorDisplay" : true
            });

    // Endfaces for rounded ends
    endFaces[] = append(endFaces[], qCapEntity(id + "sweep", CapType.EITHER, EntityType.FACE));

    // Replace faces
    if (evaluateQuery(context, weldFace1) != [])
        try(opReplaceFace(context, id + "replaceFace1", {
                        "replaceFaces" : weldFace1,
                        "templateFace" : face1,
                        "oppositeSense" : true
                    }));
    if (evaluateQuery(context, weldFace2) != [])
        try(opReplaceFace(context, id + "replaceFace2", {
                        "replaceFaces" : weldFace2,
                        "templateFace" : face2,
                        "oppositeSense" : true
                    }));

    return qCreatedBy(id + "sweep", EntityType.BODY);
}

// Fillet functions }

// Butt Weld functions {

// This function assumes definition.buttEdge is a query with one or more GeometryType.LINE
function buttWeld(context is Context, id is Id, definition is map, toDelete is box)
{
    verifyNonemptyQuery(context, definition, "buttEdge", ErrorStringEnum.CANNOT_RESOLVE_ENTITIES);
    var edges = evaluateQuery(context, definition.buttEdge);

    for (var i = 0; i < size(edges); i += 1)
    {
        var edge1 = edges[i];
        var subId = id + unstableIdComponent(i);
        setExternalDisambiguation(context, subId, edge1);

        // Parts
        var part1 = evaluateQuery(context, qOwnerBody(edge1))[0];
        // if (evaluateQuery(context, qSubtraction(qBodyType(qSketchFilter(qConstructionFilter(qEverything(EntityType.BODY), ConstructionObject.NO), SketchObject.NO), BodyType.SOLID), part1)) == [])
        // throw regenError("There must be two parts in the part studio");

        var partsDistResult = evDistance(context, {
                "side0" : edge1,
                "side1" : qSubtraction(qSketchFilter(qConstructionFilter(qEverything(EntityType.BODY), ConstructionObject.NO), SketchObject.NO), part1)
            });
        var part2 = try(evaluateQuery(
                    context,
                    qNthElement(
                        qSubtraction(qSketchFilter(qConstructionFilter(qEverything(EntityType.BODY), ConstructionObject.NO), SketchObject.NO), part1),
                        partsDistResult.sides[1].index
                    )
                )[0]);

        // Edge 2
        var edge2 = evaluateQuery(
                context,
                qClosestTo(
                    parallelEdges(context, qOwnedByBody(part2, EntityType.EDGE), edge1),
                    evEdgeTangentLine(context, { "edge" : edge1, "parameter" : 0.5 }).origin
                )
            )[0];

        // Find closest faces
        var faces1 = evaluateQuery(context, qEdgeAdjacent(edge1, EntityType.FACE));
        var faces2 = evaluateQuery(context, qEdgeAdjacent(edge2, EntityType.FACE));
        var minDistSqValue = 500 * 500;
        var face1;
        var face2;
        for (var testFace1 in faces1)
        {
            var testFaceC1 = evApproximateCentroid(context, {
                    "entities" : testFace1
                });
            for (var testFace2 in faces2)
            {
                var testFaceC2 = evApproximateCentroid(context, {
                        "entities" : testFace2
                    });
                var distSqVal = squaredNorm(testFaceC1 - testFaceC2).value;
                if (distSqVal < minDistSqValue)
                {
                    face1 = testFace1;
                    face2 = testFace2;
                    minDistSqValue = distSqVal;
                }
            }
        }

        // EdgeLines
        var edge1Line = evEdgeTangentLine(context, {
                "edge" : edge1,
                "face" : face1,
                "parameter" : 0.5
            });
        var edge2Line = evEdgeTangentLine(context, {
                "edge" : edge2,
                "face" : face2,
                "parameter" : 0.5
            });
        if (!parallelVectors(edge1Line.direction, edge2Line.direction))
            throw regenError("Edges must be parallel", qUnion([edge1, edge2]));

        // Thickness
        var thicknessEdge = evaluateQuery(context, qIntersection([qVertexAdjacent(edge1, EntityType.EDGE), qEdgeAdjacent(face1, EntityType.EDGE)]))[0];
        var thickness = evLength(context, {
                "entities" : thicknessEdge
            });

        // Sketch x axis
        var xAxis = extractDirection(context, face1);

        // Extend faces and remove weld gap
        var distanceToExtend = 0.0 * meter;
        if (partsDistResult.distance > 0.0)
        {
            distanceToExtend = partsDistResult.distance / 2.0;
            opOffsetFace(context, subId + "offsetFaces", {
                        "moveFaces" : qUnion([face1, face2]),
                        "offsetDistance" : distanceToExtend
                    });
        }

        // Sketch
        var skPlane = plane(edge1Line.origin, edge1Line.direction, xAxis);
        skPlane.origin = project(skPlane, (edge1Line.origin + edge2Line.origin) / 2);

        var profileSketch = newSketchOnPlane(context, subId + "profileSketch", {
                "sketchPlane" : skPlane
            });

        // Create each weldtype sketch
        if (definition.weldType == WeldType.V_BUTT_WELD)
            sketchVButtWeld(context, definition, thickness, profileSketch);
        else if (definition.weldType == WeldType.DOUBLE_V_BUTT_WELD)
            sketchDoubleVButtWeld(context, definition, thickness, profileSketch);
        else if (definition.weldType == WeldType.SQUARE_BUTT_WELD)
            sketchSquareButtWeld(context, definition, thickness, profileSketch);
        else if (definition.weldType == WeldType.U_BUTT_WELD)
            sketchUButtWeld(context, definition, thickness, profileSketch);
        else if (definition.weldType == WeldType.J_BUTT_WELD)
            sketchJButtWeld(context, definition, thickness, profileSketch);

        skSolve(profileSketch);

        toDelete[] = append(toDelete[], qCreatedBy(subId + "profileSketch"));

        // Finding extrude amounts
        var skCSys = planeToCSys(skPlane);
        var face1Box = evBox3d(context, {
                "topology" : face1,
                "tight" : true,
                "cSys" : skCSys
            });
        var face2Box = evBox3d(context, {
                "topology" : face2,
                "tight" : true,
                "cSys" : skCSys
            });
        var extrudeDef = {
            "entities" : qCreatedBy(subId + "profileSketch", EntityType.FACE),
            "direction" : skPlane.normal,
            "endBound" : BoundingType.BLIND,
            "endDepth" : max(face1Box.maxCorner[2], face2Box.maxCorner[2]),
            "startBound" : BoundingType.BLIND,
            "startDepth" : max(-face1Box.minCorner[2], -face2Box.minCorner[2]),
        };

        // Extrude the first time to boolean
        opExtrude(context, subId + "extrude1", extrudeDef);
        opBoolean(context, subId + "boolean", {
                    "tools" : qCreatedBy(subId + "extrude1", EntityType.BODY),
                    "targets" : qUnion([part1, part2]),
                    "operationType" : BooleanOperationType.SUBTRACTION
                });

        extrudeDef.endDepth = min(face1Box.maxCorner[2], face2Box.maxCorner[2]);
        extrudeDef.startDepth = min(-face1Box.minCorner[2], -face2Box.minCorner[2]);
        // Extrude the second time for the part
        opExtrude(context, subId + "extrude2", extrudeDef);
        setWeldNumbers(context, definition, qCreatedBy(subId + "extrude2", EntityType.BODY));
    }
}

// /**
//  *  V-Butt Weld Sketch
//  */
function sketchVButtWeld(context is Context, definition is map, thickness is ValueWithUnits, profileSketch is Sketch)
{
    var shape = definition.buttShape;
    var angle = definition.buttAngle;
    var rootGap = definition.buttRootGap;
    var rootGapWidth = definition.buttRootGapWidth;
    var rootGapHeight = definition.buttRootGapHeight;

    var distOut = rootGap ? tan(angle / 2) * (thickness - rootGapHeight) + rootGapWidth / 2 : tan(angle / 2) * thickness;

    if (shape == ButtShape.FLAT)
        skLineSegment(profileSketch, "topLine", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(distOut, 0 * meter)
                });
    else
        skArc(profileSketch, "topLine", {
                    "start" : vector(-distOut, 0 * meter),
                    "mid" : vector(0 * meter, distOut / 5),
                    "end" : vector(distOut, 0 * meter)
                });
    if (rootGap)
    {
        skLineSegment(profileSketch, "bottomLine", {
                    "start" : vector(-rootGapWidth / 2, -thickness),
                    "end" : vector(rootGapWidth / 2, -thickness)
                });
        skLineSegment(profileSketch, "sideLineVertical1", {
                    "start" : vector(-rootGapWidth / 2, -thickness),
                    "end" : vector(-rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLineVertical2", {
                    "start" : vector(rootGapWidth / 2, -thickness),
                    "end" : vector(rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLine1", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(-rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLine2", {
                    "start" : vector(distOut, 0 * meter),
                    "end" : vector(rootGapWidth / 2, -thickness + rootGapHeight)
                });
    }
    else
    {
        skLineSegment(profileSketch, "sideLine1", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(0 * meter, -thickness)
                });
        skLineSegment(profileSketch, "sideLine2", {
                    "start" : vector(distOut, 0 * meter),
                    "end" : vector(0 * meter, -thickness)
                });
    }
}

// /**
//  * Double V-Butt Weld Sketch
//  */
function sketchDoubleVButtWeld(context is Context, definition is map, thickness is ValueWithUnits, profileSketch is Sketch)
{
    var shape = definition.buttShape;
    var angle = definition.buttAngle;
    var rootGap = definition.buttRootGap;
    var rootGapWidth = definition.buttRootGapWidth;
    var rootGapHeight = definition.buttRootGapHeight;

    var distOut = rootGap ? tan(angle / 2) * (thickness - rootGapHeight) / 2 + rootGapWidth / 2 : tan(angle / 2) * thickness / 2;

    if (shape == ButtShape.FLAT)
    {
        skLineSegment(profileSketch, "topLine", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(distOut, 0 * meter)
                });
        skLineSegment(profileSketch, "bottomLine", {
                    "start" : vector(-distOut, -thickness),
                    "end" : vector(distOut, -thickness)
                });
    }
    else
    {
        skArc(profileSketch, "topLine", {
                    "start" : vector(-distOut, 0 * meter),
                    "mid" : vector(0 * meter, distOut / 5),
                    "end" : vector(distOut, 0 * meter)
                });
        skArc(profileSketch, "bottomLine", {
                    "start" : vector(-distOut, -thickness),
                    "mid" : vector(0 * meter, -thickness - distOut / 5),
                    "end" : vector(distOut, -thickness)
                });
    }
    if (rootGap)
    {
        skLineSegment(profileSketch, "sideLineVertical1", {
                    "start" : vector(-rootGapWidth / 2, -thickness / 2 - rootGapHeight / 2),
                    "end" : vector(-rootGapWidth / 2, -thickness / 2 + rootGapHeight / 2)
                });
        skLineSegment(profileSketch, "sideLineVertical2", {
                    "start" : vector(rootGapWidth / 2, -thickness / 2 - rootGapHeight / 2),
                    "end" : vector(rootGapWidth / 2, -thickness / 2 + rootGapHeight / 2)
                });
        skLineSegment(profileSketch, "sideTopLine1", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(-rootGapWidth / 2, -thickness / 2 + rootGapHeight / 2)
                });
        skLineSegment(profileSketch, "sideTopLine2", {
                    "start" : vector(distOut, 0 * meter),
                    "end" : vector(rootGapWidth / 2, -thickness / 2 + rootGapHeight / 2)
                });
        skLineSegment(profileSketch, "sideBottomLine1", {
                    "start" : vector(-distOut, -thickness),
                    "end" : vector(-rootGapWidth / 2, -thickness / 2 - rootGapHeight / 2)
                });
        skLineSegment(profileSketch, "sideBottomLine2", {
                    "start" : vector(distOut, -thickness),
                    "end" : vector(rootGapWidth / 2, -thickness / 2 - rootGapHeight / 2)
                });
    }
    else
    {
        skLineSegment(profileSketch, "sideTopLine1", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(0 * meter, -thickness / 2)
                });
        skLineSegment(profileSketch, "sideTopLine2", {
                    "start" : vector(distOut, 0 * meter),
                    "end" : vector(0 * meter, -thickness / 2)
                });
        skLineSegment(profileSketch, "sideBottomLine1", {
                    "start" : vector(-distOut, -thickness),
                    "end" : vector(0 * meter, -thickness / 2)
                });
        skLineSegment(profileSketch, "sideBottomLine2", {
                    "start" : vector(distOut, -thickness),
                    "end" : vector(0 * meter, -thickness / 2)
                });
    }
}

// /**
//  * TODO: Square Butt Weld Sketch
//  */
function sketchSquareButtWeld(context is Context, definition is map, thickness is ValueWithUnits, profileSketch is Sketch)
{
    var shape = definition.buttShape;
    var angle = definition.buttAngle;
    var rootGap = definition.buttRootGap;
    var rootGapWidth = definition.buttRootGapWidth;
    var rootGapHeight = definition.buttRootGapHeight;

    var distOut = rootGap ? tan(angle / 2) * (thickness - rootGapHeight) + rootGapWidth / 2 : tan(angle / 2) * thickness;

    if (shape == ButtShape.FLAT)
        skLineSegment(profileSketch, "topLine", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(distOut, 0 * meter)
                });
    else
        skArc(profileSketch, "topLine", {
                    "start" : vector(-distOut, 0 * meter),
                    "mid" : vector(0 * meter, distOut / 5),
                    "end" : vector(distOut, 0 * meter)
                });
    if (rootGap)
    {
        skLineSegment(profileSketch, "bottomLine", {
                    "start" : vector(-rootGapWidth / 2, -thickness),
                    "end" : vector(rootGapWidth / 2, -thickness)
                });
        skLineSegment(profileSketch, "sideLineVertical1", {
                    "start" : vector(-rootGapWidth / 2, -thickness),
                    "end" : vector(-rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLineVertical2", {
                    "start" : vector(rootGapWidth / 2, -thickness),
                    "end" : vector(rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLine1", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(-rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLine2", {
                    "start" : vector(distOut, 0 * meter),
                    "end" : vector(rootGapWidth / 2, -thickness + rootGapHeight)
                });
    }
    else
    {
        skLineSegment(profileSketch, "sideLine1", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(0 * meter, -thickness)
                });
        skLineSegment(profileSketch, "sideLine2", {
                    "start" : vector(distOut, 0 * meter),
                    "end" : vector(0 * meter, -thickness)
                });
    }
}

// /**
//  * TODO: U-Butt Weld Sketch
//  */
function sketchUButtWeld(context is Context, definition is map, thickness is ValueWithUnits, profileSketch is Sketch)
{
    // Obtiene la forma a aplicar a la soldadura en V
    var shape = definition.buttShape;

    // Obtiene el angulo y los valores del talon de raiz a aplicar a la soldadura en V
    var angle = definition.buttAngle;
    var rootGap = definition.buttRootGap;
    var rootGapWidth = definition.buttRootGapWidth;
    var rootGapHeight = definition.buttRootGapHeight;

    // Obtiene el ancho de la parte superior de la soldadura
    var distOut = rootGap ? tan(angle / 2) * (thickness - rootGapHeight) + rootGapWidth / 2 : tan(angle / 2) * thickness;

    // Si la forma de la soldadura es plana crea una linea
    if (shape == ButtShape.FLAT)
        skLineSegment(profileSketch, "topLine", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(distOut, 0 * meter)
                });
        // Si la forma de la soldadura No es plana, es convexa, crea un arco
    else
        skArc(profileSketch, "topLine", {
                    "start" : vector(-distOut, 0 * meter),
                    "mid" : vector(0 * meter, distOut / 5),
                    "end" : vector(distOut, 0 * meter)
                });

    // Si está activada la Soldadura con talon de raiz, crea la soldadura en V con talon de raiz
    if (rootGap)
    {
        skLineSegment(profileSketch, "bottomLine", {
                    "start" : vector(-rootGapWidth / 2, -thickness),
                    "end" : vector(rootGapWidth / 2, -thickness)
                });
        skLineSegment(profileSketch, "sideLineVertical1", {
                    "start" : vector(-rootGapWidth / 2, -thickness),
                    "end" : vector(-rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLineVertical2", {
                    "start" : vector(rootGapWidth / 2, -thickness),
                    "end" : vector(rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLine1", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(-rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLine2", {
                    "start" : vector(distOut, 0 * meter),
                    "end" : vector(rootGapWidth / 2, -thickness + rootGapHeight)
                });
    }
    // Si No está activada la Soldadura con talon de raiz, crea solo la soldadura en V
    else
    {
        skLineSegment(profileSketch, "sideLine1", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(0 * meter, -thickness)
                });
        skLineSegment(profileSketch, "sideLine2", {
                    "start" : vector(distOut, 0 * meter),
                    "end" : vector(0 * meter, -thickness)
                });
    }
}

// /**
//  * TODO: J-Butt Weld Sketch
//  */
function sketchJButtWeld(context is Context, definition is map, thickness is ValueWithUnits, profileSketch is Sketch)
{
    // Obtiene la forma a aplicar a la soldadura en V
    var shape = definition.buttShape;

    // Obtiene el angulo y los valores del talon de raiz a aplicar a la soldadura en V
    var angle = definition.buttAngle;
    var rootGap = definition.buttRootGap;
    var rootGapWidth = definition.buttRootGapWidth;
    var rootGapHeight = definition.buttRootGapHeight;

    // Obtiene el ancho de la parte superior de la soldadura
    var distOut = rootGap ? tan(angle / 2) * (thickness - rootGapHeight) + rootGapWidth / 2 : tan(angle / 2) * thickness;

    // Si la forma de la soldadura es plana crea una linea
    if (shape == ButtShape.FLAT)
        skLineSegment(profileSketch, "topLine", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(distOut, 0 * meter)
                });
        // Si la forma de la soldadura No es plana, es convexa, crea un arco
    else
        skArc(profileSketch, "topLine", {
                    "start" : vector(-distOut, 0 * meter),
                    "mid" : vector(0 * meter, distOut / 5),
                    "end" : vector(distOut, 0 * meter)
                });

    // Si está activada la Soldadura con talon de raiz, crea la soldadura en V con talon de raiz
    if (rootGap)
    {
        skLineSegment(profileSketch, "bottomLine", {
                    "start" : vector(-rootGapWidth / 2, -thickness),
                    "end" : vector(rootGapWidth / 2, -thickness)
                });
        skLineSegment(profileSketch, "sideLineVertical1", {
                    "start" : vector(-rootGapWidth / 2, -thickness),
                    "end" : vector(-rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLineVertical2", {
                    "start" : vector(rootGapWidth / 2, -thickness),
                    "end" : vector(rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLine1", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(-rootGapWidth / 2, -thickness + rootGapHeight)
                });
        skLineSegment(profileSketch, "sideLine2", {
                    "start" : vector(distOut, 0 * meter),
                    "end" : vector(rootGapWidth / 2, -thickness + rootGapHeight)
                });
    }
    // Si No está activada la Soldadura con talon de raiz, crea solo la soldadura en V
    else
    {
        skLineSegment(profileSketch, "sideLine1", {
                    "start" : vector(-distOut, 0 * meter),
                    "end" : vector(0 * meter, -thickness)
                });
        skLineSegment(profileSketch, "sideLine2", {
                    "start" : vector(distOut, 0 * meter),
                    "end" : vector(0 * meter, -thickness)
                });
    }
}

// Butt Weld functions }

// Utility functions {

function parallelEdges(context is Context, edges is Query, template is Query) returns Query
{
    var out = [];
    var edgesEv = evaluateQuery(context, qGeometry(edges, GeometryType.LINE));
    var templateDir = evLine(context, {
                "edge" : template
            }).direction;
    for (var edge in edgesEv)
    {
        if (parallelVectors(evLine(context, {
                            "edge" : edge
                        }).direction, templateDir))
            out = append(out, edge);
    }
    return qUnion(out);
}

const weldVariableName = "weldNumberCounter";

function setWeldNumbers(context is Context, definition is map, weld is Query)
{
    var num = 0;
    try silent
    {
        num = getVariable(context, weldVariableName);
    }
    var welds = evaluateQuery(context, weld);
    var weldTypeStr = "";
    for (var weld in welds)
    {
        num += 1;
        if (definition.weldType == WeldType.FILLET_WELD)
            weldTypeStr = "Fillet";
        else if (definition.weldType == WeldType.V_BUTT_WELD)
            weldTypeStr = "V-Butt";
        else if (definition.weldType == WeldType.DOUBLE_V_BUTT_WELD)
            weldTypeStr = "Double V-Butt";
        else if (definition.weldType == WeldType.SQUARE_BUTT_WELD)
            weldTypeStr = "Square Butt";
        else if (definition.weldType == WeldType.U_BUTT_WELD)
            weldTypeStr = "U-Butt";
        else if (definition.weldType == WeldType.J_BUTT_WELD)
            weldTypeStr = "J-Butt";
        setProperty(context, {
                    "entities" : weld,
                    "propertyType" : PropertyType.NAME,
                    "value" : "Weld " ~ num ~ " (" ~ weldTypeStr ~ ")"
                });
    }
    setVariable(context, weldVariableName, num);
}

function startTrackingSweep(context is Context, sketchId is Id, sketchEntityId is string, path is Query) returns Query
{
    const sketchQuery = sketchEntityQuery(sketchId, undefined, sketchEntityId);
    const trackingQ = startTracking(context, {
                'subquery' : qUnion([sketchQuery, makeQuery(sketchId, "IMPRINT", undefined, { "derivedFrom" : sketchQuery })]),
                'secondarySubquery' : path
            });
    return trackingQ;
}

function roundEnds(context is Context, id is Id, endFaces is Query) returns Query
{
    var faces = evaluateQuery(context, endFaces);
    var usedFaces = [];
    var counter = 0;
    var toBoolean = [];
    for (var i = 0; i < size(faces); i += 1)
    {
        var face1 = faces[i];
        if (isIn(i, usedFaces))
            continue;
        for (var j = i + 1; j < size(faces); j += 1)
        {
            var face2 = faces[j];
            if (isIn(j, usedFaces))
                continue;
            var collisions = evCollision(context, {
                    "tools" : face1,
                    "targets" : face2
                });
            if (collisions != [])
                try
                {
                    setExternalDisambiguation(context, id + unstableIdComponent(counter), qUnion([face1, face2]));
                    counter += 1;
                    var round = doRound(context, id + unstableIdComponent(counter - 1), face1, face2);
                    if (round is Query)
                        toBoolean = append(toBoolean, round);
                }
        }
    }
    return qUnion(toBoolean);
}

function doRound(context is Context, id is Id, face1 is Query, face2 is Query) returns Query
{
    var face1Plane = evPlane(context, {
            "face" : face1
        });
    var face2Plane = evPlane(context, {
            "face" : face2
        });
    var face1Area = evArea(context, {
            "entities" : face1
        });
    var face2Area = evArea(context, {
            "entities" : face2
        });
    var intersection = intersection(face1Plane, face2Plane);
    var angle = angleBetween(face1Plane.normal, -face2Plane.normal);
    if (tolerantEquals(face1Area, face2Area) && tolerantEquals(angle, 90 * degree))
    {
        opRevolve(context, id + "revolve", {
                    "entities" : face2,
                    "axis" : intersection,
                    "angleForward" : angle
                });
        return qCreatedBy(id + "revolve", EntityType.BODY);
    }
    else
    {
        opLoft(context, id + "loft", {
                    "profileSubqueries" : [face1, face2],
                    "derivativeInfo" : [{ "profileIndex" : 0, "matchCurvature" : true, "adjacentFaces" : qEdgeAdjacent(face1, EntityType.FACE) },
                            { "profileIndex" : 1, "matchCurvature" : true, "adjacentFaces" : qEdgeAdjacent(face2, EntityType.FACE) }]
                });
        return qCreatedBy(id + "loft", EntityType.BODY);
    }
}

function miterEnds(context is Context, id is Id, endFaces is Query)
{
    var faces = evaluateQuery(context, endFaces);
    var usedFaces = [];
    var counter = 0;
    for (var i = 0; i < size(faces); i += 1)
    {
        var face1 = faces[i];
        if (isIn(i, usedFaces))
            continue;
        for (var j = i + 1; j < size(faces); j += 1)
        {
            var face2 = faces[j];
            if (isIn(j, usedFaces))
                continue;
            var collisions = evCollision(context, {
                    "tools" : face1,
                    "targets" : face2
                });
            if (collisions != [])
                try
                {
                    counter += 1;
                    setExternalDisambiguation(context, id + unstableIdComponent(counter), qUnion([face1, face2]));
                    doMiter(context, id + unstableIdComponent(counter), face1, face2);
                }
        }
    }
}

function doMiter(context is Context, id is Id, face1 is Query, face2 is Query)
{
    const p1 = evPlane(context, { "face" : face1 });
    var p2 = evPlane(context, { "face" : face2 });
    p2.normal = -p2.normal;
    const intersectionR = intersection(p1, p2);
    if (intersectionR != undefined)
    {
        const angle = angleBetween(p1.normal, p2.normal);
        // move the faces to each other
        opMoveFace(context, id + "moveFace1", {
                    "moveFaces" : face1,
                    "transform" : rotationAround(intersectionR, angle / 2)
                });
        opMoveFace(context, id + "moveFace2", {
                    "moveFaces" : face2,
                    "transform" : rotationAround(intersectionR, -angle / 2)
                });
    }
}

// Utility functions }
