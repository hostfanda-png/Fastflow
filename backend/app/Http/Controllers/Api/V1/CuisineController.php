<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cuisine;
use Illuminate\Http\JsonResponse;

class CuisineController extends Controller
{
    /**
     * Get list of all centrally managed cuisine types.
     */
    public function index(): JsonResponse
    {
        $cuisines = Cuisine::orderBy('name')->get();
        return $this->sendResponse($cuisines, 'Cuisines retrieved successfully');
    }
}
