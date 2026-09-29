<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name', 'Fastflow') }} - API Service</title>
    <link href="https://fonts.bunny.net/css?family=figtree:400,600&display=swap" rel="stylesheet" />
    <style>
        body {
            font-family: 'Figtree', sans-serif;
            background-color: #090d16;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 600px;
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        h1 { color: #f59e0b; margin-bottom: 0.5rem; }
        p { color: #9ca3af; line-height: 1.6; }
        .badge {
            display: inline-block;
            background: #064e3b;
            color: #34d399;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>{{ config('app.name') }} REST API</h1>
        <p>Production-ready Multi-Vendor Restaurant & Delivery Backend engine running Laravel 11 on PHP 8.2+.</p>
        <div class="badge">API Status: Operational</div>
    </div>
</body>
</html>
