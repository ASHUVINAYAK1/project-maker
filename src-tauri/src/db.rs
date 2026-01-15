use serde::{Deserialize, Serialize};
use tiberius::{Client, Config, AuthMethod, ColumnData, ToSql, QueryItem};
use tokio::net::TcpStream;
use tokio_util::compat::{Compat, TokioAsyncWriteCompatExt};
use futures_util::stream::TryStreamExt;
use serde_json::{Map, Value};

pub struct DbState {
    pub config: Config,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct QueryResult {
    pub rows: Vec<Value>,
}

pub async fn connect(config: &Config) -> Result<Client<Compat<TcpStream>>, tiberius::error::Error> {
    println!("[Rust DB] Connecting to: {}", config.get_addr());
    let tcp = TcpStream::connect(config.get_addr()).await?;
    tcp.set_nodelay(true)?;

    let client = Client::connect(config.clone(), tcp.compat_write()).await?;
    println!("[Rust DB] Connected successfully.");
    Ok(client)
}

fn column_to_json(data: ColumnData<'_>) -> Value {
    match data {
        ColumnData::Binary(Some(b)) => Value::String(hex::encode(b)),
        ColumnData::Bit(Some(b)) => Value::Bool(b),
        ColumnData::U8(Some(i)) => Value::Number(i.into()),
        ColumnData::I16(Some(i)) => Value::Number(i.into()),
        ColumnData::I32(Some(i)) => Value::Number(i.into()),
        ColumnData::I64(Some(i)) => Value::Number(i.into()),
        ColumnData::F32(Some(f)) => serde_json::json!(f),
        ColumnData::F64(Some(f)) => serde_json::json!(f),
        ColumnData::String(Some(s)) => Value::String(s.to_string()),
        ColumnData::Guid(Some(g)) => Value::String(g.to_string()),
        _ => Value::Null,
    }
}

fn json_to_sql_param(val: &Value) -> Box<dyn ToSql + Sync> {
    match val {
        Value::String(s) => Box::new(s.clone()),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Box::new(i)
            } else if let Some(f) = n.as_f64() {
                Box::new(f)
            } else {
                Box::new(0i64)
            }
        },
        Value::Bool(b) => Box::new(*b),
        _ => Box::new(Option::<String>::None),
    }
}

#[tauri::command]
pub async fn execute_sql(state: tauri::State<'_, DbState>, sql: String, params: Vec<Value>) -> Result<u64, String> {
    println!("[Rust DB] Executing SQL: {}", sql);
    let mut client = connect(&state.config).await.map_err(|e| {
        println!("[Rust DB] Connect error: {}", e);
        e.to_string()
    })?;
    
    let mut processed_sql = sql.clone();
    for i in 1..=params.len() {
        processed_sql = processed_sql.replacen('?', &format!("@p{}", i), 1);
    }

    let sql_params: Vec<Box<dyn ToSql + Sync>> = params.iter().map(json_to_sql_param).collect();
    let ref_params: Vec<&dyn ToSql> = sql_params.iter().map(|p| p.as_ref() as &dyn ToSql).collect();

    let res = client.execute(processed_sql, &ref_params).await.map_err(|e| {
        println!("[Rust DB] Execute error: {}", e);
        e.to_string()
    })?;
    
    let affected = res.rows_affected().first().cloned().unwrap_or(0);
    println!("[Rust DB] Rows affected: {}", affected);
    Ok(affected)
}

#[tauri::command]
pub async fn query_sql(state: tauri::State<'_, DbState>, sql: String, params: Vec<Value>) -> Result<Value, String> {
    println!("[Rust DB] Querying SQL: {}", sql);
    let mut client = connect(&state.config).await.map_err(|e| {
        println!("[Rust DB] Connect error: {}", e);
        e.to_string()
    })?;
    
    let mut processed_sql = sql.clone();
    for i in 1..=params.len() {
        processed_sql = processed_sql.replacen('?', &format!("@p{}", i), 1);
    }

    let sql_params: Vec<Box<dyn ToSql + Sync>> = params.iter().map(json_to_sql_param).collect();
    let ref_params: Vec<&dyn ToSql> = sql_params.iter().map(|p| p.as_ref() as &dyn ToSql).collect();

    let mut stream = client.query(processed_sql, &ref_params).await.map_err(|e| {
        println!("[Rust DB] Query error: {}", e);
        e.to_string()
    })?;
    
    let mut rows = Vec::new();

    while let Some(item) = stream.try_next().await.map_err(|e| {
        println!("[Rust DB] Stream error: {}", e);
        e.to_string()
    })? {
        match item {
            QueryItem::Row(row) => {
                let mut map = Map::new();
                let col_names: Vec<String> = row.columns().iter().map(|c| c.name().to_string()).collect();
                for (name, data) in col_names.into_iter().zip(row.into_iter()) {
                    map.insert(name, column_to_json(data));
                }
                rows.push(Value::Object(map));
            },
            _ => {}
        }
    }
    
    println!("[Rust DB] Rows returned: {}", rows.len());
    Ok(Value::Array(rows))
}
