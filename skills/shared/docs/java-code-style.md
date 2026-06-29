# Java 代码格式规范

---

## 1. 行宽

- **行宽上限 160 字符**。不强制在 80/100/120 处换行。
- 只有方法签名、链式调用、注释等**真正超出 160 字符**时才折行。
- 示例：

```java
// ✅ 一行写满，不提前换行
List<UserDTO> result = userRepository.findByDepartmentIdAndStatusAndCreatedDateAfter(deptId, Status.ACTIVE, startDate);

// ❌ 没到 160 就折行
List<UserDTO> result = userRepository
        .findByDepartmentIdAndStatusAndCreatedDateAfter(deptId, Status.ACTIVE, startDate);
```

## 2. 链式调用

- Stream / Builder / Optional 等链式调用**鼓励连续写**，单行不超 160 就不折。
- 只有单步过长或总长度超出 160 时才逐级折行。

```java
// ✅ 短链不折行
return users.stream().filter(u -> u.isActive()).map(UserDTO::new).toList();

// ✅ 单步过长才折
return users.stream()
        .filter(u -> u.getDepartmentId() != null && u.getStatus() == Status.ACTIVE)
        .map(u -> modelMapper.map(u, UserDTO.class))
        .toList();
```

## 3. 类声明与继承

- `extends` 和 `implements` 尽量与类名同行，不超 160 不折行。

```java
// ✅
public class UserServiceImpl extends ServiceImpl<UserMapper, UserEntity> implements UserService {

// ❌ 没超长就折
public class UserServiceImpl extends ServiceImpl<UserMapper, UserEntity>
        implements UserService {
```

## 4. 方法签名

- 参数列表在同一行写完，超出 160 才折行。
- 折行时每个参数单独一行，与第一个参数对齐。

```java
// ✅
public PageResult<UserDTO> queryUsers(String keyword, Status status, LocalDateTime startDate, LocalDateTime endDate, PageQuery pageQuery) {

// ✅ 真正超长才折
public PageResult<UserDTO> queryUsers(
        String keyword, DepartmentType deptType, EmploymentStatus empStatus,
        LocalDateTime startDate, LocalDateTime endDate, PageQuery pageQuery) {
```

## 5. 注解

- 短注解（`@Override`、`@NotNull`、`@JsonIgnore`）可以放在字段/方法同行。
- 类级别注解与类声明之间不空行。

## 6. SQL / JPQL

- SQL 语句字符串不刻意拆行，简单查询可一行写完。
- 复杂查询（JOIN、子查询等）按子句折行。

---

> **原则**：优先保持代码在一行，超过 160 字符再折行。
