---
name: gen-enum
description: 当需要新建枚举类时使用。自动适配当前项目包路径，禁止写死。
---

# Java code ↔ msg 枚举生成

## 适用场景

- 新建 `code ↔ msg` 形式的枚举类
- 为已有枚举补全 `getCodeByMsg` / `getMsgByCode` 双向查找方法

## 模板

包路径按当前项目实际枚举目录动态确定，禁止写死。

```java
package <动态确定>;

import lombok.Getter;
import org.apache.commons.lang3.StringUtils;

import java.util.Arrays;

/**
 * <描述>
 *
 * @since <yyyy-MM-dd>
 */
@Getter
public enum <EnumName> {

    <KEY>("code", "msg"),
    ;

    private final String code;
    private final String msg;

    <EnumName>(String code, String msg) {
        this.code = code;
        this.msg = msg;
    }

    public static String getCodeByMsg(String msg) {
        if (StringUtils.isEmpty(msg)) return null;
        return Arrays.stream(values())
                .filter(e -> e.msg.equals(msg))
                .map(<EnumName>::getCode)
                .findFirst()
                .orElse(null);
    }

    public static String getMsgByCode(String code) {
        if (StringUtils.isEmpty(code)) return null;
        return Arrays.stream(values())
                .filter(e -> e.code.equals(code))
                .map(<EnumName>::getMsg)
                .findFirst()
                .orElse(null);
    }
}
```

## 规则

1. 包路径通过 Grep 已有枚举动态确定，不写死
2. `getCodeByMsg` + `getMsgByCode` 缺一不可
3. `StringUtils.isEmpty` 空安全，无匹配返回 `null`
4. Lombok `@Getter`，不手写 getter
5. 构造器显式写出，不用 `@AllArgsConstructor`
6. 枚举值按 code 字典序排列
7. `@since` 用当天日期
