<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cuisine extends Model
{
    protected $fillable = ['name', 'slug'];

    public function restaurants()
    {
        return $this->belongsToMany(Restaurant::class, 'restaurant_cuisines');
    }
}
