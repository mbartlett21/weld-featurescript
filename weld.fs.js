FeatureScript 937;
import(path : "onshape/std/geometry.fs", version : "937.0");


export enum WeldType
{
    annotation { "Name" : "Fillet weld" }
    FILLET_WELD,
    // Not supported yet
    annotation { "Name" : "V-Butt weld", "Hidden" : true }
    V_BUTT_WELD
}

export enum FilletShape
{
    annotation { "Name" : "Convex" }
    CONVEX,
    annotation { "Name" : "Concave" }
    CONCAVE
}

export enum FilletCornerShape
{
    annotation { "Name" : "Round" }
    ROUND,
    // Not supported yet
    annotation { "Name" : "Miter", "Hidden" : true }
    MITER,
    annotation { "Name" : "None" }
    NONE
}

const filletWeldVariableName = "filletWeldNumber";

function getNextFilletWeldNumber(context is Context)
{
    var out = 1;
    try silent
    {
        out = getVariable(context, filletWeldVariableName) + 1;
    }
    setVariable(context, filletWeldVariableName, out);
    return out;
}

// Utility function for tracking query with sweep
function startTrackingSweep(context is Context, sketchId is Id, sketchEntityId is string, path is Query) returns Query
{
    const sketchQuery = sketchEntityQuery(sketchId, undefined, sketchEntityId);
    const trackingQ = startTracking(context, {
                'subquery' : qUnion([sketchQuery, makeQuery(sketchId, "IMPRINT", undefined, { "derivedFrom" : sketchQuery })]),
                'secondarySubquery' : path
            });
    return trackingQ;
}

annotation { "Feature Type Name" : "Weld" }
export const weld = defineFeature(function(context is Context, id is Id, definition is map)
    precondition
    {
        annotation { "Name" : "Weld Type", "UIHint" : ["HORIZONTAL_ENUM", "REMEMBER_PREVIOUS_VALUE"] }
        definition.weldType is WeldType;

        // if (definition.weldType == WeldType.V_BUTT_WELD)
        // {
        //     annotation { "Name" : "Welded faces", "Filter" : E, "MaxNumberOfPicks" : 1 }
        //     definition.vButtFace is Query;

        //     annotation { "Name" : "Welded plate thickness", "Filter" : EntityType.EDGE && EdgeTopology.TWO_SIDED, "MaxNumberOfPicks" : 1 }
        //     definition.thicknessButt is Query;

        //     annotation { "Name" : "Contour" }
        //     definition.contourButt is contourButtEnum;

        //     annotation { "Name" : "Angle" }
        //     isAngle(definition.myAngle, MY_ANGLE_BOUNDS);

        //     annotation { "Name" : "Root Gap" }
        //     definition.rootGap is boolean;

        //     if (definition.rootGap)
        //     {
        //         annotation { "Name" : "Rooth width" }
        //         isLength(definition.rWidth, R_WIDTH_BOUNDS);

        //         annotation { "Name" : "Root height" }
        //         isLength(definition.rHeight, R_HEIGHT_BOUNDS);

        //     }


        // }
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

            annotation { "Name" : "Max weld gap" }
            isLength(definition.filletWeldGap, SHELL_OFFSET_BOUNDS);

            // Tangent propagation propagates filletEntities1
            annotation { "Name" : "Tangent propagation" }
            definition.filletPropagation is boolean;

            annotation { "Name" : "Corner style", "UIHint" : ["REMEMBER_PREVIOUS_VALUE", "SHOW_LABEL"] }
            definition.filletCornerShape is FilletCornerShape;
        }
    }
    {
        if (definition.weldType == WeldType.FILLET_WELD)
        {
            filletWeld(context, id, definition);
        }
        else
            throw regenError("Weld type not supported");
    });

function filletWeld(context is Context, id is Id, definition is map)
{
    var cornerShape = definition.filletCornerShape;
    var propagate = definition.filletPropagation;
    var toDelete = new box([]);
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
                var dist = evDistance(context, {
                            "side0" : faces1[i],
                            "side1" : faces2[j]
                        }).distance;
                if (dist > definition.filletWeldGap && !tolerantEquals(definition.filletWeldGap, dist))
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
                setExternalDisambiguation(context, filletId, qUnion([filletDef.face1, filletDef.face2]));
                if (faceDefs1[i] is Plane && faceDefs2[j] is Plane)
                {
                    doPlanarFilletWeld(context, filletId, filletDef, toDelete, endFaces);
                }
                if (!(faceDefs1[i] is Plane) && faceDefs2[j] is Plane)
                {
                    doNonPlanarPlanarFilletWeld(context, filletId, filletDef, toDelete, endFaces);
                }
                if (faceDefs1[i] is Plane && !(faceDefs2[j] is Plane))
                {
                    filletDef = mergeMaps(filletDef, {
                                "face1" : faces2[j],
                                "face2" : faces1[i],
                                "face1Def" : faceDefs2[j],
                                "face2Def" : faceDefs1[i],
                            });
                    doNonPlanarPlanarFilletWeld(context, filletId, filletDef, toDelete, endFaces);
                }
                welds = append(welds, qCreatedBy(filletId, EntityType.BODY));
            }
        }
    }
    if (cornerShape == FilletCornerShape.ROUND && endFaces[] != [] && size(evaluateQuery(context, qOwnerBody(qUnion(endFaces[])))) > 1)
    {
        welds = append(welds, roundEnds(context, id + "round", qUnion(endFaces[])));
    }
    if (toDelete[] != [])
        opDeleteBodies(context, id + "delete", {
                    "entities" : qUnion(toDelete[])
                });
    if (size(evaluateQuery(context, qUnion(welds))) >= 2)
        opBoolean(context, id + "booleanTogether", {
                    "tools" : qUnion(welds),
                    "operationType" : BooleanOperationType.UNION
                });
    var allWelds = evaluateQuery(context, qUnion(welds));
    for (var weld in allWelds)
    {
        var weldNo = getNextFilletWeldNumber(context);
        setProperty(context, {
                    "entities" : weld,
                    "propertyType" : PropertyType.NAME,
                    "value" : "Fillet Weld " ~ weldNo
                });
    }
}

function roundEnds(context is Context, id is Id, endFaces is Query)
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
                try silent
                {
                    setExternalDisambiguation(context, id + unstableIdComponent(counter), qUnion([face1, face2]));
                    counter += 1;
                    var round = doRound(context, id + unstableIdComponent(counter - 1), face1, face2);
                    toBoolean = append(toBoolean, round);
                }
        }
    }
    return qUnion(toBoolean);
}

function doRound(context is Context, id is Id, face1 is Query, face2 is Query)
{
    var face1Plane = evPlane(context, {
            "face" : face1
        });
    var face2Plane = evPlane(context, {
            "face" : face2
        });
    var intersection = intersection(face1Plane, face2Plane);
    var angle = angleBetween(face1Plane.normal, -face2Plane.normal);
    opRevolve(context, id + "revolve", {
                "entities" : face2,
                "axis" : intersection,
                "angleForward" : angle
            });
    return qCreatedBy(id + "revolve", EntityType.BODY);
}

function doPlanarFilletWeld(context is Context, id is Id, definition is map, toDelete is box, endFaces is box)
{
    var face1 = definition.face1;

    var face1Plane = definition.face1Def;

    var face2 = definition.face2;
    var face2Plane = definition.face2Def;

    var shape is FilletShape = definition.filletShape;

    var intersection = intersection(face1Plane, face2Plane);

    if (intersection is undefined)
        return;

    var skPlane = plane(intersection.origin, intersection.direction);
    var face1Dir = cross(skPlane.normal, face1Plane.normal);

    var face2Dir = -cross(skPlane.normal, face2Plane.normal);

    var angle = angleBetween(face1Dir, face2Dir);
    var size = definition.filletSize / sin(angle);

    var face1Point = worldToPlane(skPlane, intersection.origin + face1Dir * size);
    var face1SkDir = normalize(face1Point);

    var face2Point = worldToPlane(skPlane, intersection.origin + face2Dir * size);
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
    skArc(sketch, "arc", {
                "start" : face1Point,
                "mid" : normalize(face1SkDir + face2SkDir) * dist * (shape == FilletShape.CONVEX ? 1.15 : 0.75),
                "end" : face2Point
            });
    skSolve(sketch);
    toDelete[] = append(toDelete[], qCreatedBy(id + "sketch"));

    // Weld Faces
    var weldFace1 = qEntityFilter(startTracking(context, id + "sketch", "face1Line"), EntityType.FACE);
    var weldFace2 = qEntityFilter(startTracking(context, id + "sketch", "face2Line"), EntityType.FACE);

    // Sketch face
    var sketchFace = qCreatedBy(id + "sketch", EntityType.FACE);

    var extrudeDef = {
        "entities" : sketchFace,
        "direction" : skPlane.normal,
        "startBound" : BoundingType.THROUGH_ALL,
        "endBound" : BoundingType.THROUGH_ALL
    };
    opExtrude(context, id + "extrude", extrudeDef);

    var subId = id + "trim";
    try
    {
        // Offset weld faces
        opOffsetFace(context, subId + "offsetFaces", {
                    "moveFaces" : qUnion([weldFace1, weldFace2]),
                    "offsetDistance" : TOLERANCE.booleanDefaultTolerance * meter
                });

        // Boolean part from weld
        opBoolean(context, subId + "boolean", {
                    "tools" : qUnion([qOwnerBody(face1), qOwnerBody(face2)]),
                    "targets" : qCreatedBy(id + "extrude", EntityType.BODY),
                    "operationType" : BooleanOperationType.SUBTRACTION,
                    "keepTools" : true
                });

        // Cut weld
        if (evaluateQuery(context, weldFace1) != [])
            opExtrude(context, subId + "extrude1", {
                        "entities" : weldFace1,
                        "direction" : face2Dir,
                        "endBound" : BoundingType.THROUGH_ALL
                    });

        if (evaluateQuery(context, weldFace2) != [])
            opExtrude(context, subId + "extrude2", {
                        "entities" : weldFace2,
                        "direction" : face1Dir,
                        "endBound" : BoundingType.THROUGH_ALL
                    });

        if (evaluateQuery(context, qUnion([qCreatedBy(subId + "extrude1", EntityType.BODY), qCreatedBy(subId + "extrude2", EntityType.BODY)])) != [])
            opBoolean(context, subId + "booleanCut", {
                        "tools" : qUnion([qCreatedBy(subId + "extrude1", EntityType.BODY), qCreatedBy(subId + "extrude2", EntityType.BODY)]),
                        "targets" : qCreatedBy(id + "extrude", EntityType.BODY),
                        "operationType" : BooleanOperationType.SUBTRACTION
                    });

        // Extend faces to part again
        var faceQ1 = qParallelPlanes(qCreatedBy(subId + "booleanCut", EntityType.FACE), -face1Plane.normal, false);
        var faceQ2 = qParallelPlanes(qCreatedBy(subId + "booleanCut", EntityType.FACE), -face2Plane.normal, false);
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
        endFaces[] = append(endFaces[], qCapEntity(id + "extrude", CapType.EITHER, EntityType.FACE));

        // More end faces
        endFaces[] = append(endFaces[], qSubtraction(qCreatedBy(subId + "booleanCut", EntityType.FACE), qUnion([qParallelPlanes(qCreatedBy(subId + "booleanCut", EntityType.FACE), -face1Plane.normal, false), qParallelPlanes(qCreatedBy(subId + "booleanCut", EntityType.FACE), -face2Plane.normal, false)])));
    }
    catch
    {
        toDelete[] = append(toDelete[], qCreatedBy(id + "extrude"));

        var cSys = planeToCSys(skPlane);
        var faceBox1 = evBox3d(context, {
                "topology" : face1,
                "tight" : true,
                "cSys" : cSys
            });
        var faceBox2 = evBox3d(context, {
                "topology" : face2,
                "tight" : true,
                "cSys" : cSys
            });
        var maxDist = min(faceBox1.maxCorner[2], faceBox2.maxCorner[2]);
        var minDist = max(faceBox1.minCorner[2], faceBox2.minCorner[2]);
        var extrudeDef = {
            "entities" : sketchFace,
            "direction" : skPlane.normal,
            "startBound" : BoundingType.BLIND,
            "endBound" : BoundingType.BLIND,
            "isStartBoundOpposite" : minDist < 0,
            "endDepth" : maxDist,
            "startDepth" : abs(minDist)
        };
        opExtrude(context, id + "extrudeOld", extrudeDef);
        endFaces[] = append(endFaces[], qCapEntity(id + "extrudeOld", CapType.EITHER, EntityType.FACE));
    }
}

function doNonPlanarPlanarFilletWeld(context is Context, id is Id, definition is map, toDelete is box, endFaces is box)
{
    var face1 = definition.face1;

    var face2 = definition.face2;
    var face2Plane = definition.face2Def;

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

    var intersection = intersection(face1Plane, face2Plane);

    var skPlane = plane(project(intersection, distResult.sides[0].point), intersection.direction);
    var face1Dir = cross(skPlane.normal, face1Plane.normal);
    var face1Point = worldToPlane(skPlane, intersection.origin + face1Dir * size);
    var face1SkDir = normalize(face1Point);

    var face2Dir = -cross(skPlane.normal, face2Plane.normal);
    var face2Point = worldToPlane(skPlane, intersection.origin + face2Dir * size);
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
    skArc(sketch, "arc", {
                "start" : face1Point,
                "mid" : normalize(face1SkDir + face2SkDir) * dist * (shape == FilletShape.CONVEX ? 1.15 : 0.75),
                "end" : face2Point
            });
    skSolve(sketch);
    toDelete[] = append(toDelete[], qCreatedBy(id + "sketch"));

    // Weld Faces
    var weldFace1 = qEntityFilter(startTrackingSweep(context, id + "sketch", "face1Line", qClosestTo(qEdgeAdjacent(face1, EntityType.EDGE), distResult.sides[0].point)), EntityType.FACE);
    var weldFace2 = qEntityFilter(startTrackingSweep(context, id + "sketch", "face1Line", qClosestTo(qEdgeAdjacent(face1, EntityType.EDGE), distResult.sides[0].point)), EntityType.FACE);

    // Sketch face
    var sketchFace = qCreatedBy(id + "sketch", EntityType.FACE);

    var sweepDef = {
        "profiles" : sketchFace,
        "path" : qClosestTo(qEdgeAdjacent(face1, EntityType.EDGE), distResult.sides[0].point),
        "lockFaces" : face1
    };
    opSweep(context, id + "sweep", sweepDef);

    // Endfaces for rounded ends
    endFaces[] = append(endFaces[], qCapEntity(id + "sweep", CapType.EITHER, EntityType.FACE));

    try
    {
        // Replace faces
        var faceQ1 = weldFace1;
        var faceQ2 = weldFace2;
        if (evaluateQuery(context, faceQ1) != [])
            opReplaceFace(context, id + "replaceFace1", {
                        "replaceFaces" : faceQ1,
                        "templateFace" : face1,
                        "oppositeSense" : true
                    });
        if (evaluateQuery(context, faceQ2) != [])
            opReplaceFace(context, id + "replaceFace2", {
                        "replaceFaces" : faceQ2,
                        "templateFace" : face2,
                        "oppositeSense" : true
                    });
    }
}
